import { apiSuccess } from '@/lib/http/admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  return apiSuccess({
    status: 'ok',
    service: 'overdrive-permits',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version ?? 'unknown',
    checks: {
      supabase_url_configured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      supabase_anon_key_configured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    },
  })
}
