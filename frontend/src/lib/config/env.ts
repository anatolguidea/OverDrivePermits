const CRITICAL_ENV_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
] as const

export function ensureCriticalEnvConfigured(): void {
  const required = [
    ...CRITICAL_ENV_VARS,
    ...(process.env.ADMIN_2FA_REQUIRED === 'true' ? ['ADMIN_2FA_COOKIE_SECRET'] : []),
  ]
  const missing = required.filter((name) => !process.env[name])
  if (missing.length === 0) return

  // Fail fast outside local development; in dev we allow boot for easier troubleshooting.
  if (process.env.NODE_ENV !== 'development') {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }
}
