async function loadSentry() {
  try {
    return await import('@sentry/nextjs')
  } catch {
    return null
  }
}

export async function register() {
  const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN
  if (!dsn) return

  const sentry = await loadSentry()
  if (!sentry) return

  sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? '0.1'),
  })
}
