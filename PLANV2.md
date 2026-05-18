OSW Permits — Admin Dashboard Improvement Plan
Audience: Claude Code (working in the existing repo)
Scope: Admin side only. Customer-facing portal, live route map, and multi-user access are out of scope for this pass and will be built later. The DB schema and some admin code already exist — your job is to audit what is there, fix it where needed, and finish the admin experience to production grade.
Primary goals: (1) operator can run the whole permit-brokerage business from this one panel, (2) sensitive data — customer cards and state-portal credentials — is stored correctly from day one, (3) the UI is fast and unambiguous for operators doing 50+ orders a day.

1. Business domain — read this before touching code
OSW Permits is a permit-brokerage for oversize/overweight (OS/OW) trucking. The operator logs into state DOT portals on behalf of carriers, pulls permits state-by-state along a route, and invoices the carrier. The admin dashboard is the operator's cockpit.
Key nouns in the domain (these map directly to DB tables — see §4):

Customer — a carrier company (e.g. "NOMAD EXPRESS GROUP"). Has USDOT, FEIN, MC, IFTA numbers, billing contact, stored payment method, and a set of per-state portal logins.
Truck / Trailer — equipment owned by a customer. Truck has unit #, year, make, VIN, plate, plate state. Trailer has its own unit #, year, make, plate, VIN. An order references one truck + one trailer combo.
Order — one permit job for one customer + one truck/trailer combo on one date. Contains many Permit line items, each for a different state along the route.
Permit (line item) — state + cost + status (Pending / Submitted / Issued / Rejected). Belongs to one order.
State Credential — operator's login to a specific state's DOT permitting portal, scoped per customer (because some states require the carrier's own account, others use the broker's shared account).
Payment Method — carrier's card, used by the operator to pay state fees on the carrier's behalf.
Invoice — generated from an order; lists the permits, state fees, and the operator's service fee.

The spreadsheet screenshots in the original brief show the current manual workflow — blocks of states with fees and "Issued" status. The dashboard is replacing that spreadsheet.

2. Audit of existing code — do this first
Before writing new features, Claude Code should open the repo and produce an audit report covering the points below. Do not start building until this report is reviewed.

DB schema walkthrough. List every table, its columns, and its foreign keys. Flag any of these against §4 of this plan:

tables missing that §4 requires
columns that should be encrypted/tokenized but are stored in plaintext (especially anything named like password, card_number, cvv, cvc, ssn)
missing created_at / updated_at / soft-delete columns
missing indexes on foreign keys and on any column used in list views (e.g. orders.status, orders.created_at)


Auth & session. How is the operator currently authenticated? Is the session cookie HttpOnly, Secure, SameSite=Lax? Is there CSRF protection on state-changing routes? Are passwords hashed with argon2id or bcrypt (cost ≥ 12)?
Route/handler inventory. List every admin route, its HTTP method, and what it does. Flag any route that performs a write via GET.
Frontend stack. What framework, what component library, what form library, what state store? Note anything inconsistent (e.g. some pages using one pattern, others using another).
Secrets handling. Where do DB credentials, session secret, and (future) Stripe keys live? Confirm they are NOT committed to the repo. If .env is committed, that is a P0 bug — rotate and remove from git history.
Error handling & logging. Is there a single error boundary? Is there structured logging? Do logs redact passwords and card data?

Output the audit as AUDIT.md in the repo root. Every finding gets a severity (P0 / P1 / P2) and a one-line remediation.

3. Target architecture (keep what's already there if it fits)

Server: whatever the repo uses (Node/Express, Next.js API routes, Fastify, Django, Rails — don't rewrite). The rules below are framework-agnostic.
DB: Postgres. If the existing DB is MySQL or SQLite, note it in AUDIT.md — Postgres is strongly preferred for this workload (partial indexes, jsonb, pgcrypto). Do not migrate yet; get the app working first.
Card data: do not store PAN, CVV, or expiry in your own DB. Use Stripe (recommended) or another PCI-compliant vault. Store only the Stripe customer_id and payment_method_id on your customer_payment_methods row. This drops you from PCI-DSS SAQ D to SAQ A. This is non-negotiable for production.
State-portal credentials: encrypt at rest using envelope encryption. Master key lives in AWS KMS / GCP KMS / HashiCorp Vault — not in .env. Per-row DEK encrypted with the KMS key. If a proper KMS is not yet available, use a single app-level key loaded from the secrets manager and document the upgrade path. Decryption only happens in a narrow server function that logs every access with operator_id, customer_id, state, and timestamp.
Background jobs: a queue (BullMQ if Node, Celery/RQ if Python, Sidekiq if Ruby) for invoice PDF generation and any future email sending. Not required on day one but the seams should be there.
File storage: S3 or equivalent for invoice PDFs and any permit document uploads. Signed URLs for download, never public buckets.


4. Data model
All tables get id (uuid v4), created_at, updated_at, and deleted_at (soft delete, nullable) unless noted.
4.1 operators (admin users of the dashboard)

email (unique, citext)
password_hash (argon2id)
full_name
role (enum: owner, admin, dispatcher, viewer) — enforced server-side; the UI hides things but the server is the boundary
last_login_at, failed_login_count, locked_until
totp_secret (nullable, encrypted) — 2FA is required for owner and admin roles before go-live

4.2 customers

company_name, dba_name
usdot, mc, fein (encrypted — FEIN is PII), ifta
address_line_1, address_line_2, city, state, zip
contact_name, contact_phone, contact_email
billing_email
notes (free text, operator-only)

4.3 trucks

customer_id → customers
unit_number (carrier's internal #, e.g. "406")
year, make (e.g. "FRHT", "VOLV", "INTL"), model
plate, plate_state, plate_expiry
vin
registered_weight
active (bool)

4.4 trailers

customer_id → customers
unit_number
year, make (e.g. "REITNOUER", "MAC TRAILER")
plate, plate_state, plate_expiry
vin
type (flatbed, stepdeck, etc.)
active (bool)

4.5 customer_state_credentials (the "Add customer account" popup from the brief)

customer_id → customers
state (2-letter enum: AL, AZ, etc., plus non-state entries like "Winnebago County Highway Dep" — use a wider jurisdiction string, not a strict state enum)
username
password_encrypted (bytea, envelope-encrypted — never plaintext)
password_last_rotated_at
notes
Unique: (customer_id, jurisdiction, username)

4.6 customer_payment_methods

customer_id → customers
stripe_customer_id, stripe_payment_method_id
brand (visa, mc, amex — returned from Stripe, for display)
last4, exp_month, exp_year (all returned from Stripe, safe to store)
cardholder_name, billing_zip
is_default (bool)
Never store PAN or CVV. Your code must never accept those into your own server — use Stripe.js or a hosted Stripe Element on the client, which returns a payment_method_id token.

4.7 orders

customer_id → customers
truck_id, trailer_id
order_number (human-readable, e.g. "OSW-2026-000412", generated)
driver_name
origin, destination (freeform for now; later becomes route geometry)
dimensions (jsonb: length, width, height, weight, overhang_front, overhang_rear, overhang_left, overhang_right)
status (enum: draft, active, completed, cancelled)
created_by_operator_id
assigned_operator_id (nullable)
service_fee_cents
notes

4.8 order_permits (the line items — one per state on the route)

order_id → orders
jurisdiction (same jurisdiction string as credentials)
state_fee_cents
status (enum: pending, in_progress, submitted, issued, rejected, not_needed)
permit_number (once issued)
issued_at, valid_from, valid_until
submitted_at, submitted_by_operator_id
document_s3_key (nullable — the PDF from the state portal)
sort_order (int — so the horizontal strip in the dashboard shows states in route order)

4.9 invoices

order_id → orders
customer_id → customers (denormalized for billing)
invoice_number (generated, e.g. "INV-2026-0001")
issued_at, due_at
status (enum: draft, sent, paid, overdue, void)
subtotal_cents, tax_cents, total_cents
paid_at, payment_method_id (which stored card, nullable)
pdf_s3_key
line_items (jsonb — snapshot at time of invoice; never compute live from order, because orders change)

4.10 audit_log (every sensitive access)

operator_id, action (e.g. credential.view, card.charge, order.delete)
entity_type, entity_id
ip, user_agent
metadata (jsonb)
Append-only — no update, no delete, no soft-delete. Consider moving to a separate DB role with INSERT-only privilege.


5. Features — specs with acceptance criteria
5.1 Dashboard (landing page after login)
What operator sees:

A header strip with counters: Active orders, Orders awaiting submission, Permits issued today, Overdue invoices.
A single primary table: Active Orders, newest first.
Each row shows: order #, customer, truck unit, driver, created date, total fee, and — the key element — a horizontal permit strip: one pill per state, color-coded by status:

grey = pending
amber = in progress
blue = submitted
green = issued
red = rejected
slashed grey = not needed


Clicking a pill opens that permit in a side drawer to update status, paste permit number, upload PDF.
Clicking the row opens the full order page.

Acceptance:

Loads in under 400ms for up to 200 active orders. Use server-side pagination past that.
The permit strip renders states in route order (order_permits.sort_order), not alphabetical.
Color meanings are in a legend visible on first visit; subsequent visits hide it behind a "?" icon.
Keyboard shortcut n opens the New Order modal. / focuses search.

5.2 New Order flow ("++ New Order" button)
A modal or dedicated page. Reference: osow.express/order-form/new. Fields, in order:

Customer — typeahead select. If new, "+ Add customer" opens the customer form inline.
Truck + Trailer — typeahead filtered by selected customer. Disabled until customer is picked. "+ Add truck" inline.
Driver name — plain text.
Origin → Destination — for now, two text inputs. Later this becomes the map.
Dimensions block — length, width, height, weight, 4 overhang fields. Validate numeric + sensible ranges (width > 8'6" is the trigger for OSW, flag if not).
States needed — multi-select or chip input. Each chip gets a fee input. Order of chips = route order (drag to reorder). This populates order_permits.
Service fee — operator's cut.
Notes.

Acceptance:

Submit is disabled until required fields validate. Errors show inline, not in a toast.
On submit, order is created in draft status. A "Activate order" button moves it to active and it appears on the dashboard.
The form can be saved as draft (Cmd/Ctrl+S) and resumed.
Creating a new customer or truck mid-flow does not lose the order form state.

5.3 Customer management
Customer list page: searchable, sortable, paginated. Columns: company, USDOT, contact, # trucks, # open orders, last order date.
Customer detail page has tabs:

Overview — company info, edit inline.
Equipment — tables of trucks and trailers, each row editable inline, "+ Add" button.
State credentials — "Add customer account" button opens the popup from the brief: jurisdiction, username, password. On save, password is encrypted before it leaves the server. List view shows jurisdiction + username + "••••••••" with a Reveal button that requires re-entering the operator's password AND writes to audit_log.
Payment methods — list of stored cards (brand + last4 + expiry only). "+ Add card" opens a Stripe Element; the card number field is inside an iframe hosted by Stripe and never touches your server. On save, you store only the token fields (§4.6).
Orders — all orders for this customer, filterable by status.
Invoices — all invoices, with paid/unpaid status and "Charge now" button (uses stored card via Stripe).

5.4 Order detail page
Top: order header with customer, truck/trailer, driver, dimensions, total fee, status.
Middle: Permits table — one row per state. Columns: state, fee, status (inline dropdown), permit #, valid from/until, PDF (upload / view), submitted by. Inline editing saves on blur.
Right sidebar: activity feed pulled from audit_log for this order.
Bottom: Generate Invoice button — creates the invoice record and renders a preview. "Send invoice" emails the PDF to the customer's billing email.
5.5 Invoicing
Invoice generator (reference: invoice-generator.com/app/documents). Two modes:

Auto from order — pulls line items from order_permits + service fee.
Manual — operator adds arbitrary line items (for non-order work).

Invoice PDF includes operator's branding (use the MADAIG LLC dba NOMAD EXPRESS GROUP block from the brief as the default sender, but make it editable in Settings so multiple brokers can use the tool).
Charging a stored card — "Charge" button on the invoice calls Stripe PaymentIntent with the saved payment_method_id. On success, invoice flips to paid, a row is written to audit_log. On failure, show the Stripe error message verbatim to the operator.
5.6 Settings (minimal for v1)

Operator profile (change name, email, password, enable 2FA).
Business profile (the MADAIG block — company name, addresses, tax IDs, logo for invoices).
Invoice numbering prefix and starting number.
Default service fee.


6. Security — non-negotiables before go-live
This is a system that holds (a) customer card tokens, (b) state-portal passwords, (c) federal tax IDs. Treat it like a financial product.

TLS everywhere. HTTPS only. HSTS header with max-age=31536000; includeSubDomains; preload. Redirect HTTP to HTTPS.
Card data: PCI-DSS compliance via Stripe (or equivalent). Your server never sees a PAN. Confirm by grep -riE 'card_number|pan|cvv|cvc' src/ — should return zero hits in your own code.
Credentials at rest: envelope encryption with KMS. See §3.
Credentials in transit inside the app: the decrypted password is returned only to the operator viewing it, over HTTPS, and is never logged, never put in a URL, never stored in browser history. Use autocomplete="off" on the reveal UI and clear the clipboard after a configurable timeout if the operator copies it.
Auth: argon2id password hashing (memory ≥ 64MB, iterations ≥ 3, parallelism = 1). Account lockout after 10 failed attempts within 15 minutes. 2FA required for owner and admin.
Session: cookie-based, HttpOnly, Secure, SameSite=Lax. Idle timeout 30 min, absolute timeout 12 hours. Session invalidation on password change.
CSRF: double-submit cookie or synchronizer token on every non-GET route.
Authorization: check role server-side on every route. Write an integration test that, for each route, asserts an unauthorized role gets 403. The UI hiding a button is not access control.
Input validation: a schema validator (Zod, Joi, Pydantic, whatever matches the stack) at the edge of every handler. Reject unknown fields.
SQL: parameterized queries or a proper ORM. grep for string concatenation into SQL — zero hits.
Rate limiting: login endpoint 10/min per IP, 5/min per email. API overall 300/min per operator. Use a sliding window in Redis (or Postgres if Redis not available yet).
Audit log: §4.10 — write on every credential view, card charge, permit status change, and any delete.
Logging: structured JSON logs. Redact any field whose key matches /password|token|secret|card|ssn|fein/i. Ship to a log aggregator.
Backups: nightly encrypted Postgres snapshots, retained 30 days, restore tested monthly. Do this before go-live, not after.
Dependency scanning: npm audit / pip-audit / equivalent in CI, fail on high severity.
Security headers: Content-Security-Policy (no unsafe-inline), X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Referrer-Policy: same-origin, Permissions-Policy restricting camera/mic/geo.

One bright line: if a feature request conflicts with any of these, the feature waits, the security stays.

7. UI / UX principles
The operator is doing this job 40+ hours a week. The UI should feel like a tool, not a marketing site.

Density first. Tables with thin rows, not card grids. Excel refugees should feel at home.
Keyboard navigable. Tab order is sane, Enter submits, Esc closes, / focuses search, n new order, Cmd/Ctrl+K command palette for jumping to any customer/order/invoice.
Inline editing for any field that changes often (permit status, permit number, fee). Click the cell, edit, blur saves. Optimistic update with rollback on server error.
No destructive action without confirmation, but also no confirmation for reversible ones (status change is reversible; delete customer is not).
Color is information, not decoration. Status colors are consistent across the whole app (see §5.1). Never use red for anything except errors and rejected permits.
Typography: one sans-serif family (Inter is a safe default), 14px body, 13px table cells. Tabular numerals (font-variant-numeric: tabular-nums) on every numeric column.
Loading states on every async action — skeletons for lists, spinners on buttons (with aria-busy).
Empty states that tell the operator what to do next, not just "No data".
Mobile: not a priority for the admin — operators will use desktop. Make sure it doesn't break on tablet, but don't invest in phone layouts yet.
Accessibility: WCAG AA contrast ratios, focus rings visible, form fields have <label>, icons have aria-label. Screen-reader friendly even if no operator uses one today — it's free hygiene.


8. Suggested build order
Each step ends with a tag and a deploy. Don't batch multiple steps into one deploy.

Audit (§2) → AUDIT.md committed. No code changes yet.
Schema & migrations — align the DB with §4. Write migrations for anything missing. Seed script with 2 test customers, 3 trucks each, 5 sample orders.
Auth hardening — argon2id, session cookie flags, CSRF, rate limiting, 2FA scaffolding (enrollment + verify routes; enforcement flag off by default until §10).
Stripe integration — customer creation, PaymentMethod attach via Stripe Element, one test charge end-to-end in test mode.
Credential vault — envelope encryption, add/view/reveal flow, audit logging on reveal.
Customer CRUD (§5.3) — list, detail, equipment, credentials, payment methods tabs.
Order CRUD + permits (§5.2, §5.4) — new order flow, order detail, permit line items with inline editing.
Active Orders dashboard (§5.1) — the color-coded permit strip.
Invoicing (§5.5) — generate PDF, email, charge stored card.
Security pass — walk every item in §6, flip 2FA enforcement on, run a dependency audit, test backup restore.
UX pass — keyboard shortcuts, empty states, loading skeletons, accessibility audit.
Production cutover — env vars in a secrets manager, logs flowing to aggregator, Sentry (or equivalent) on.

Expected time for a single full-time dev: 4–6 weeks to step 9, 1–2 weeks for 10–12.

9. Production readiness checklist
Before handing credentials to the client:

 All P0 and P1 items from AUDIT.md resolved
 §6 walked item-by-item, every box checked
 2FA enforced for owner and admin
 Stripe in live mode, test charge made and refunded
 Backup taken, restore verified into a staging DB
 Error monitoring (Sentry or similar) receiving events
 Uptime monitoring on the health endpoint
 At least one operator other than the developer can complete the full flow: create customer → add truck → add credential → create order → issue permit → generate invoice → charge card
 README.md documents: how to run locally, how to run migrations, how to rotate the KMS key, how to restore from backup, who to call when it breaks


10. What Claude Code should ask before starting

What stack is the existing repo on? (This plan is stack-agnostic but step 2 onward depends on it.)
Is Postgres already the DB, or something else?
Is there a Stripe account already, or does the client need to create one?
Is there a secrets manager / KMS available, or are we on .env for now?
Who is the first operator (email) so the seed script can create their account?

Don't proceed past §2 (Audit) until those five answers are in hand.