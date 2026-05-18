# OVERDRIVE PERMITS Admin

Operational Next.js app for customer, fleet, order, permit, invoice, and admin workflows.

## Local Run

1. Install dependencies:
```bash
cd frontend
npm install
```

2. Create `.env.local` from `.env.local.example` and set at minimum:
```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
CREDENTIALS_ENCRYPTION_KEY=...
ADMIN_2FA_COOKIE_SECRET=...
RESEND_API_KEY=...
RESEND_FROM_EMAIL=...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

3. Start the app:
```bash
npm run dev
```

4. Verify core endpoints:
```bash
curl http://localhost:3000/api/health
```

## Database Migrations

Apply the SQL files in `supabase/migrations/` in order against the target Supabase project. The current app expects all migrations from `0001_init_admin_schema.sql` through `0014_invoice_settings.sql`.

For a fresh environment, seed reference data with `supabase/seed.sql` after schema creation.

## Security and Key Rotation

- Rotate `SUPABASE_SERVICE_ROLE_KEY` in Supabase, then update the deployment platform immediately.
- Rotate `CREDENTIALS_ENCRYPTION_KEY` only with a planned credential re-encryption migration; existing encrypted credentials depend on the current key.
- Rotate `ADMIN_2FA_COOKIE_SECRET` to invalidate all active admin 2FA sessions.
- Rotate `RESEND_API_KEY` in Resend if invoice delivery credentials are exposed.
- Set `SENTRY_DSN` for production error monitoring.

## Backup Restore

1. Restore the Supabase/Postgres backup into a clean project.
2. Re-apply any missing migrations so the restored schema matches the app code.
3. Restore storage objects for permit documents and invoice PDFs if backups are managed separately.
4. Reconfigure environment secrets before reopening admin access.
5. Hit `/api/health` and log in with an owner/admin account to confirm app readiness.

## Verification

```bash
npm test
npm run lint
npm run build
npm run audit:ci
```

`npm run audit:ci` fails on high and critical vulnerabilities.
