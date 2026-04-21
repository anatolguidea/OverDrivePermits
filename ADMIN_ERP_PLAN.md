# OSW Permits — Admin ERP Dashboard: Implementation Plan

## Production Decisions (Finalized)

| Decision | Choice | Rationale |
|---|---|---|
| Tailwind scoping | Scoped to `(admin)` route group only | Preserves CSS-Module landing page; no preflight conflicts |
| Password encryption | App-layer AES-256-GCM (Node `crypto`, key in env) | Portable, testable, no Supabase extension dependency, works locally |
| PDF generation | `@react-pdf/renderer` server-side from Phase 1 | Production-grade from day 1; browser print is fragile and not deployable |
| Admin auth | `admins` table allowlist | Simpler than JWT app_metadata; manageable via SQL; no Edge Function required |
| Decimal math | Integer cents in JS, `numeric(12,2)` in DB | Eliminates floating-point billing bugs |
| API validation | `zod` + server-side check on every route handler | Defense-in-depth; middleware is not enough |
| State management | TanStack Query v5 with server-component hydration | Matches Next.js 14 App Router best practices |

---

## Current Stack (Existing — Do Not Break)

- Next.js 14.0.4, App Router
- CSS Modules on all landing-page components
- `react-hook-form` + `yup` (landing page form — untouched)
- `nodemailer` email endpoint at `/api/permit`
- No Tailwind, no Supabase, no TanStack Query installed yet

---

## Target Stack (Admin Surface)

- Tailwind CSS + shadcn/ui (scoped to admin)
- Supabase (PostgreSQL + Auth + Storage)
- TanStack Query v5
- `react-hook-form` + `zod` (admin forms)
- `@react-pdf/renderer` (invoice PDF)

---

## Folder Structure

```
frontend/
├── supabase/
│   └── migrations/
│       ├── 0001_init_admin_schema.sql
│       └── 0002_seed_states.sql
└── src/
    ├── middleware.ts                         # Route gate: /admin/* and /api/admin/*
    ├── app/
    │   ├── (admin)/
    │   │   ├── layout.tsx                    # Admin shell: sidebar + header + Providers
    │   │   ├── login/page.tsx
    │   │   └── admin/
    │   │       ├── dashboard/page.tsx        # Active Orders Dashboard (default after login)
    │   │       ├── orders/
    │   │       │   ├── page.tsx
    │   │       │   ├── new/page.tsx
    │   │       │   └── [id]/
    │   │       │       ├── page.tsx
    │   │       │       └── edit/page.tsx
    │   │       ├── customers/
    │   │       │   ├── page.tsx
    │   │       │   ├── new/page.tsx
    │   │       │   └── [id]/
    │   │       │       ├── page.tsx          # Tabs: Info | Fleet | Credentials | Orders
    │   │       │       └── edit/page.tsx
    │   │       ├── invoices/
    │   │       │   ├── page.tsx
    │   │       │   ├── new/page.tsx
    │   │       │   └── [id]/page.tsx         # Printable / PDF invoice
    │   │       └── reports/page.tsx          # Phase 6 stub
    │   ├── api/
    │   │   ├── admin/
    │   │   │   ├── customers/route.ts
    │   │   │   ├── customers/[id]/route.ts
    │   │   │   ├── vehicles/route.ts
    │   │   │   ├── vehicles/[id]/route.ts
    │   │   │   ├── credentials/route.ts
    │   │   │   ├── credentials/[id]/route.ts
    │   │   │   ├── orders/route.ts
    │   │   │   ├── orders/[id]/route.ts
    │   │   │   ├── permits/route.ts
    │   │   │   ├── permits/[id]/route.ts
    │   │   │   ├── permits/[id]/upload/route.ts
    │   │   │   ├── invoices/route.ts
    │   │   │   └── invoices/[id]/route.ts
    │   │   └── permit/route.ts               # EXISTING — unchanged
    │   ├── page.tsx                          # EXISTING landing page — unchanged
    │   ├── layout.tsx                        # EXISTING root layout — unchanged
    │   ├── privacy-policy/                   # EXISTING — unchanged
    │   └── terms-of-service/                 # EXISTING — unchanged
    ├── components/
    │   ├── admin/
    │   │   ├── layout/
    │   │   │   ├── Sidebar.tsx
    │   │   │   ├── TopBar.tsx
    │   │   │   └── Providers.tsx             # QueryClientProvider + Toaster
    │   │   ├── orders/
    │   │   │   ├── OrdersTable.tsx
    │   │   │   ├── OrderFilters.tsx
    │   │   │   ├── PermitProgressChips.tsx
    │   │   │   ├── NewOrderWizard.tsx
    │   │   │   └── PermitRowsEditor.tsx
    │   │   ├── customers/
    │   │   │   ├── CustomerForm.tsx
    │   │   │   ├── FleetTable.tsx
    │   │   │   └── CredentialsDialog.tsx
    │   │   ├── invoices/
    │   │   │   ├── InvoiceForm.tsx
    │   │   │   ├── InvoiceLineItems.tsx
    │   │   │   └── InvoicePreview.tsx
    │   │   └── shared/
    │   │       ├── DataTable.tsx
    │   │       ├── StatusBadge.tsx
    │   │       ├── ConfirmDialog.tsx
    │   │       └── EmptyState.tsx
    │   └── [existing landing components — unchanged]
    ├── lib/
    │   ├── supabase/
    │   │   ├── server.ts                     # Server-side Supabase client (SSR cookies)
    │   │   ├── browser.ts                    # Browser Supabase client (singleton)
    │   │   ├── middleware.ts                 # Middleware Supabase client
    │   │   └── types.ts                      # Generated: supabase gen types
    │   ├── crypto/
    │   │   └── credentials.ts               # AES-256-GCM encrypt/decrypt
    │   ├── queries/
    │   │   ├── useOrders.ts
    │   │   ├── useCustomers.ts
    │   │   └── useInvoices.ts
    │   ├── repositories/
    │   │   ├── customers.repo.ts
    │   │   ├── vehicles.repo.ts
    │   │   ├── credentials.repo.ts
    │   │   ├── orders.repo.ts
    │   │   ├── permits.repo.ts
    │   │   └── invoices.repo.ts
    │   └── validators/
    │       ├── customer.schema.ts
    │       ├── vehicle.schema.ts
    │       ├── credential.schema.ts
    │       ├── order.schema.ts
    │       ├── permit.schema.ts
    │       └── invoice.schema.ts
    └── styles/
        ├── global.css                        # EXISTING — unchanged
        ├── variables.css                     # EXISTING — unchanged
        └── admin.css                         # NEW: Tailwind directives (admin only)
```

---

## Database Schema

### Enums
```sql
CREATE TYPE vehicle_type     AS ENUM ('truck', 'trailer');
CREATE TYPE order_status     AS ENUM ('draft', 'active', 'completed', 'cancelled');
CREATE TYPE permit_status    AS ENUM ('pending', 'submitted', 'issued');
CREATE TYPE invoice_status   AS ENUM ('draft', 'sent', 'paid');
```

### Tables

**customers**
```
id uuid PK | name text | usdot text UNIQUE | mc_number text | fein text
ifta_number text | email text | phone text | address_line1 text
address_line2 text | city text | state_code char(2) | zip text
created_by uuid FK auth.users | created_at | updated_at
```

**vehicles**
```
id uuid PK | customer_id uuid FK customers CASCADE
unit_number text | vin text UNIQUE NULLABLE | plate_number text
make text | year int | vehicle_type vehicle_type
created_at | updated_at
UNIQUE(customer_id, unit_number)
```

**customer_credentials**
```
id uuid PK | customer_id uuid FK customers CASCADE
state_code char(2) | username text
password_ciphertext bytea | password_iv bytea | password_tag bytea
notes text | created_at | updated_at
UNIQUE(customer_id, state_code, username)
```

**orders**
```
id uuid PK | order_number text UNIQUE  -- auto: ORD-2026-00001
customer_id uuid FK customers | vehicle_id uuid FK vehicles
status order_status DEFAULT 'draft'
origin text | destination text | route_states text[]
trip_date date | notes text
created_by uuid FK auth.users | created_at | updated_at
```

**permits**
```
id uuid PK | order_id uuid FK orders CASCADE
state_code char(2) | status permit_status DEFAULT 'pending'
cost numeric(10,2) | permit_number text
document_url text | issue_date date | submitted_at timestamptz
created_at | updated_at
UNIQUE(order_id, state_code)
```

**invoices**
```
id uuid PK | invoice_number text UNIQUE  -- auto: INV-2026-00001
customer_id uuid FK customers | order_id uuid FK orders NULLABLE
subtotal numeric(12,2) | tax numeric(12,2) DEFAULT 0
total_amount numeric(12,2) GENERATED ALWAYS AS (subtotal + tax) STORED
status invoice_status DEFAULT 'draft'
issue_date date | due_date date | paid_at timestamptz | notes text
created_by uuid FK auth.users | created_at | updated_at
```

**invoice_line_items**
```
id uuid PK | invoice_id uuid FK invoices CASCADE
description text | quantity numeric(10,2) | unit_price numeric(10,2)
subtotal numeric(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED
position int | created_at
```

**admins**
```
user_id uuid PK FK auth.users ON DELETE CASCADE
role text DEFAULT 'admin' | created_at
```

**us_states** (reference)
```
code char(2) PK | name text
```

### Key Constraints & Automation
- `updated_at` auto-touch trigger on all mutable tables
- `order_number` and `invoice_number` generated via sequences in BEFORE INSERT trigger
- `invoices.subtotal` recomputed via trigger on `invoice_line_items` insert/update/delete
- RLS enabled on all tables; policy: `auth.uid() IN (SELECT user_id FROM admins)`
- Supabase Storage bucket `permit-documents`: private, admin-only write policy

---

## Implementation Phases

### Phase 1: DB + Auth + Tailwind/shadcn + Layout Shell
**Complexity: Medium | Est: 2–3 days**

1. Install all new dependencies
2. Configure Tailwind scoped to admin paths (no preflight on landing)
3. Initialize shadcn/ui
4. Write `0001_init_admin_schema.sql` migration
5. Write `0002_seed_states.sql` migration
6. Create Supabase clients (server / browser / middleware)
7. Create credentials crypto module (AES-256-GCM)
8. Create `src/middleware.ts` (route gate)
9. Create login page (`/login`)
10. Create admin shell layout (Sidebar + TopBar + Providers)

**DoD**: Sign in at `/login` → land on `/admin/dashboard` empty state, sidebar visible. Unauthenticated `/admin/*` redirects. Anon Supabase client denied by RLS.

---

### Phase 2: Active Orders Dashboard
**Complexity: Medium | Est: 2 days**

11. Orders repository + `useOrders` TanStack Query hook
12. `PermitProgressChips` component (state badges: grey/yellow/green)
13. `OrdersTable` with shadcn Table + quick-action dropdown per row
14. `OrderFilters` (status, customer, date range)
15. Dashboard page wiring (server prefetch + client hydration)
16. Tests: unit + integration + Playwright E2E (login → dashboard → filter)

**DoD**: Seeded orders render with correct state chips; filters work.

---

### Phase 3: Customer & Fleet & Credentials
**Complexity: Medium | Est: 2–3 days**

17. Customers repo + list/detail pages
18. `CustomerForm` (company info / tax IDs / contact / address)
19. Customer detail page with tabs: Overview | Fleet | Credentials | Orders
20. `FleetTable` (add/edit trucks & trailers, VIN validation)
21. `CredentialsDialog` (state portal logins, masked password with reveal, AES roundtrip)
22. Tests: credentials encrypt/decrypt roundtrip, VIN validator, E2E add-customer flow

**DoD**: Create customer → add vehicle → add state credential (encrypted in DB, decryptable in UI).

---

### Phase 4: New Order Flow + Permit Management
**Complexity: Medium-Large | Est: 2–3 days**

23. Order + permit schemas (zod)
24. `NewOrderWizard`: customer → vehicle → route → per-state permit rows
25. Postgres RPC function `create_order_with_permits()` (atomic insert)
26. Order detail page: permits grid, status transitions, document upload to Storage
27. API routes: orders + permits + upload
28. Tests: wizard state machine, atomic insert, E2E create-order-to-issued

**DoD**: Admin creates order with 3 states, uploads doc, transitions one permit to Issued; dashboard reflects.

---

### Phase 5: Invoicing Module
**Complexity: Medium | Est: 2 days**

29. Invoice schema + repo
30. `InvoiceForm` + `InvoiceLineItems` (auto-totals, integer cents in JS)
31. Invoices list page (filters: status, customer, date)
32. `InvoicePreview` + `@react-pdf/renderer` PDF export
33. Status transitions: Draft → Sent → Paid (stamps `paid_at`)
34. Dashboard "Create Invoice" quick-action wired from order row
35. Tests: arithmetic (property-based), status guards, E2E create-and-mark-paid

**DoD**: Full invoice lifecycle; PDF downloads correctly; totals accurate to cent.

---

### Phase 6 (Future): Reports + Polish
- Revenue by month, permits by state, top customers charts
- Email invoice via existing nodemailer
- Audit log table
- Bulk CSV import for customers/vehicles

---

## Risk Register

| Risk | Severity | Mitigation |
|---|---|---|
| Tailwind preflight resets CSS-Module landing styles | Medium | Scope `content` to `(admin)/**`; import `admin.css` only in admin layout |
| Service role key leaking to browser bundle | High | `import 'server-only'` in all server modules; env validator at startup |
| Portal passwords in logs / query cache | High | Never log password field; dedicated decrypt endpoint; scrub React Query cache on unmount |
| Non-atomic order+permits insert → orphan permits | Medium | Postgres RPC `create_order_with_permits()` in a transaction |
| `/api/admin/*` open if middleware misconfigured | High | Every API route re-checks admin membership server-side (defense-in-depth) |
| Invoice floating-point errors | Medium | Store `numeric(12,2)` in DB; compute with integer cents in JS |
| File upload abuse (malware, oversized) | Medium | MIME allowlist (pdf/png/jpg), 10 MB cap, Storage admin-only write policy |

---

## Success Criteria

- [ ] Unauthenticated users cannot access `/admin/*` or `/api/admin/*` (middleware + route-level + RLS, all tested)
- [ ] Admin can CRUD customers, vehicles, and encrypted state credentials
- [ ] Admin can create order with N state permits, upload docs, transition statuses
- [ ] Dashboard shows per-order state chips color-coded by permit status
- [ ] Admin can generate invoice with line items, mark Sent/Paid, download PDF
- [ ] Existing public landing page (`/`) and `/api/permit` are unchanged and functional
- [ ] 80%+ test coverage on `src/lib/` and `src/components/admin/`
- [ ] Security checklist satisfied: no hardcoded secrets, all inputs validated via zod, no plaintext passwords logged, service role key server-only
