interface ContentSecurityPolicyInput {
  isDev: boolean
  supabaseUrl?: string
  siteUrl?: string
}

function compact(values: Array<string | undefined | false>): string[] {
  return values.filter((value): value is string => Boolean(value))
}

export function buildContentSecurityPolicy(input: ContentSecurityPolicyInput): string {
  const siteOrigin = input.siteUrl ? new URL(input.siteUrl).origin : undefined
  const supabaseOrigin = input.supabaseUrl ? new URL(input.supabaseUrl).origin : undefined

  const connectSrc = compact([
    "'self'",
    siteOrigin,
    supabaseOrigin,
    supabaseOrigin?.replace('https://', 'wss://'),
    'https://o450.ingest.sentry.io',
    input.isDev && 'http://localhost:*',
    input.isDev && 'ws://localhost:*',
  ]).join(' ')

  const scriptSrc = compact([
    "'self'",
    input.isDev && "'unsafe-eval'",
  ]).join(' ')

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "object-src 'none'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    `connect-src ${connectSrc}`,
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https:",
    "media-src 'self' blob: data:",
    "worker-src 'self' blob:",
  ].join('; ')
}
