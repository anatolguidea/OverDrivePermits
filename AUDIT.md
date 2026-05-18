# OSW Permits Admin Dashboard — Security & Code Audit

This document captures findings from a pre-launch code review of the OSW Permits admin dashboard (Next.js 14 App Router, TypeScript, Supabase Postgres/Auth/Storage). Findings are classified P0 (must fix before go-live), P1 (fix before soft launch), and P2 (fix before heavy production use). Each entry includes the affected area, a concise description, and a one-line remediation note.

---

## Summary Table

| # | Severity | Area | Finding |
|---|---|---|---|
| 1 | P0 | Data | FEIN stored in plaintext |
| 2 | P0 | Auth | No CSRF protection |
| 3 | P0 | Auth | No rate limiting |
| 4 | P0 | Security | No security response headers |
| 5 | P0 | Crypto | Single app-level encryption key, no KMS |
| 6 | P1 | Auth | Supabase bcrypt instead of argon2id |
| 7 | P1 | Auth | No account lockout |
| 8 | P1 | Auth | No 2FA scaffolding |
| 9 | P1 | AuthZ | RBAC not enforced on most write routes |
| 10 | P1 | Audit | Audit log missing IP + user-agent |
| 11 | P1 | Schema | Legacy vehicles table (replaced by trucks/trailers) |
| 12 | P1 | Schema | Legacy state_code in permits/credentials |
| 13 | P1 | Logging | No structured logging with redaction |
| 14 | P1 | Ops | No health endpoint |
| 15 | P2 | Schema | route_states redundant with permits.jurisdiction |
| 16 | P2 | Data | Invoice line items not snapshotted |
| 17 | P2 | Data | No soft-delete on orders/invoices |
| 18 | P2 | Query | Soft-delete filter missing in some repos |
| 19 | P2 | Perf | Missing composite indexes |
| 20 | P2 | Ops | No dependency scanning in CI |
| 21 | P2 | Ops | No backup/restore runbook |
| 22 | P2 | Schema | invoicesListQuerySchema missing overdue/void |
| 23 | P2 | Code | Next.js 15 params must be awaited |

---

## P0 — Must Fix Before Go-Live

### 1. FEIN stored in plaintext

**Area:** Data  
**Finding:** The `customers.fein` column stores the Federal Employer Identification Number as unencrypted plaintext. FEIN is regulated PII and must not be stored in the clear.  
**Remediation:** Migration 0005 adds `fein_ciphertext`, `fein_iv`, and `fein_tag` columns; backfill all existing rows and drop the plaintext column before production deployment.

---

### 2. No CSRF protection on API routes

**Area:** Auth  
**Finding:** Next.js App Router API routes rely only on same-site cookies. There is no double-submit token or synchronizer token pattern in place, leaving state-changing endpoints vulnerable to cross-site request forgery.  
**Remediation:** Add CSRF middleware that verifies a `x-csrf-token` header against a session-bound value on all non-GET routes.

---

### 3. No rate limiting on login or API endpoints

**Area:** Auth  
**Finding:** There is no rate limiting on the Supabase auth endpoint or any API route, allowing an attacker to brute-force credentials or enumerate accounts without restriction.  
**Remediation:** Implement a Postgres-based sliding-window rate limiter: 10 login attempts/min/IP, 5/min/email, and 300 API calls/min/operator.

---

### 4. No security response headers

**Area:** Security  
**Finding:** The application sets no security-related HTTP response headers. Missing headers include HSTS, Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, and Permissions-Policy.  
**Remediation:** Add a Next.js middleware module that sets all required security headers on every response.

---

### 5. Credential encryption key is a single app-level secret

**Area:** Crypto  
**Finding:** Credential encryption uses a single key stored in `.env` with no per-row DEK and no KMS integration. A leaked `.env` file compromises all stored credentials simultaneously.  
**Remediation:** Implement per-row data-encryption keys (DEK) wrapped with a KMS master key; Phase 4 defines a pluggable KMS interface with a local fallback and a documented upgrade path.

---

## P1 — High Priority — Fix Before Soft Launch

### 6. Supabase uses bcrypt, not argon2id

**Area:** Auth  
**Finding:** PLANV2 §6 requires argon2id with memory ≥ 64 MB. Supabase Auth uses bcrypt internally and this cannot be overridden without replacing Supabase Auth entirely.  
**Remediation:** Accept deviation; document in ADR-001. Compensating controls: account lockout after 10 failures/15 min, mandatory 2FA for owner/admin roles, and rate limiting (see finding 3).

---

### 7. No account lockout after failed login attempts

**Area:** Auth  
**Finding:** There is no mechanism to lock an account after repeated failed login attempts, leaving password-based accounts exposed to sustained brute-force attacks.  
**Remediation:** Track `failed_login_count` in `operator_profiles`; set `locked_until` after 10 failures within 15 minutes and reject further login attempts until the lockout expires.

---

### 8. No 2FA scaffolding

**Area:** Auth  
**Finding:** PLANV2 requires two-factor authentication for owner and admin roles before go-live. No TOTP enrollment or verification flow exists.  
**Remediation:** Phase 2 adds TOTP enrollment and verification routes conforming to RFC 6238; enforce 2FA for owner and admin on every login.

---

### 9. RBAC not enforced on most write routes

**Area:** AuthZ  
**Finding:** Most API routes call `requireAdmin(supabase)` without specifying `allowedRoles`. As a result, a `viewer`-role operator can write orders, update permit statuses, and perform other privileged mutations.  
**Remediation:** Define a centralized role-permission matrix; add `allowedRoles` to every write route handler; add integration tests asserting HTTP 403 for each unauthorized role.

---

### 10. Audit log missing IP and user-agent

**Area:** Audit  
**Finding:** `admin_audit_logs` records who performed an action and what action was taken, but captures no network context (IP address, user-agent), making incident investigation significantly harder.  
**Remediation:** Migration 0011 adds `ip` and `user_agent` columns; `requireAdmin` captures these values from request headers and passes them to the audit-log writer.

---

### 11. Legacy `vehicles` table remains after trucks/trailers split

**Area:** Schema  
**Finding:** The `vehicles` polymorphic table has been superseded by dedicated `trucks` and `trailers` tables, but the old table and its `vehicle_id` FK on `orders` remain as unreferenced dead weight.  
**Remediation:** After all application code is migrated to the trucks/trailers API routes, drop the `vehicles` table and the `vehicle_id` foreign key from `orders`.

---

### 12. Legacy `state_code` column in permits/credentials

**Area:** Schema  
**Finding:** `permits.state_code` was replaced by `permits.jurisdiction` to support non-state jurisdictions (county and authority permits). The old strict 2-letter `state_code` column remains as nullable legacy data.  
**Remediation:** Migration 0009 adds `jurisdiction` and backfills from `state_code`; remove `state_code` in a follow-up migration once all UI reads from `jurisdiction`.

---

### 13. No structured logging with redaction

**Area:** Logging  
**Finding:** All error reporting uses `console.error`. Sensitive field values (passwords, tokens, FEIN, card data) may appear in logs without redaction.  
**Remediation:** Phase 9 introduces Pino JSON logger with a redact configuration matching `/password|token|secret|card|ssn|fein/i` applied to all log output.

---

### 14. No health endpoint

**Area:** Ops  
**Finding:** There is no `/api/health` route, making uptime monitoring and deployment readiness checks impossible without scraping application pages.  
**Remediation:** Phase 11 adds a health route that verifies DB connectivity and storage reachability, returning a structured JSON response.

---

## P2 — Medium Priority — Fix Before Heavy Production Use

### 15. `orders.route_states` is redundant with `permits.jurisdiction`

**Area:** Schema  
**Finding:** The `route_states` text array on `orders` duplicates information already present in `order_permits.jurisdiction`. The two can drift out of sync over time.  
**Remediation:** Derive route states from permits at read time, or retain `route_states` as a display-only denormalization and document `order_permits.jurisdiction` as the authoritative source.

---

### 16. Invoice line items are not snapshotted at creation

**Area:** Data  
**Finding:** Invoice totals are computed live from `invoice_line_items`. If an associated order or permit changes after an invoice is issued, the invoice total changes retroactively.  
**Remediation:** Migration 0010 adds a `line_items_snapshot` jsonb column; populate it at invoice creation time to freeze the line items and total.

---

### 17. No soft-delete on orders or invoices

**Area:** Data  
**Finding:** Orders and invoices are hard-deleted, making deletions irreversible and erasing audit history for those records.  
**Remediation:** Migrations 0007 and 0010 add `deleted_at` timestamp columns; all delete operations should set this column rather than issuing a hard `DELETE`.

---

### 18. Soft-delete filter missing in some repository queries

**Area:** Query  
**Finding:** `findOrders` filters `deleted_at IS NULL`, but other repository `findBy*` methods may return soft-deleted records, making deleted data visible in list views.  
**Remediation:** Audit all `findBy*` queries across repositories and add `.is('deleted_at', null)` to every query that should exclude deleted records.

---

### 19. Missing composite indexes on frequently-queried columns

**Area:** Perf  
**Finding:** `orders(status, created_at)`, `permits(order_id, sort_order)`, and `invoices(customer_id, status)` lack composite indexes, causing sequential scans on common dashboard queries as data volume grows.  
**Remediation:** Migration 0012 adds all missing performance indexes.

---

### 20. No dependency scanning in CI

**Area:** Ops  
**Finding:** `npm audit` is not run as part of the CI pipeline. A supply-chain vulnerability in a transitive dependency could go undetected until manually discovered.  
**Remediation:** Add an `npm audit --audit-level=high` step to the GitHub Actions workflow and fail the build on high or critical findings.

---

### 21. No backup/restore procedure documented

**Area:** Ops  
**Finding:** Supabase provides point-in-time recovery, but no restore runbook exists, and restore procedures have not been tested. Recovery time in an incident is unknown.  
**Remediation:** Phase 11 adds a backup-restore runbook and establishes a monthly restore-test schedule with documented RTO/RPO targets.

---

### 22. `invoicesListQuerySchema` missing `overdue` and `void` statuses

**Area:** Schema  
**Finding:** Migration 0010 introduced `overdue` and `void` as valid invoice status values, but `invoicesListQuerySchema` in `admin-api.schema.ts` does not accept them, causing 400 errors when filtering by these statuses.  
**Remediation:** Update `invoicesListQuerySchema` in `admin-api.schema.ts` to include `'overdue' | 'void'` in the status union.

---

### 23. Next.js 15 `params` must be awaited

**Area:** Code  
**Finding:** Several API route handlers access `params.id` synchronously. In Next.js 15+, `params` is a Promise and synchronous access is deprecated, producing warnings and eventual breakage on upgrade.  
**Remediation:** Await params at the top of each handler: `const { id } = await params`.
