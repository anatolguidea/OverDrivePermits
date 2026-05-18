import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { apiError, apiSuccess } from '@/lib/http/admin'
import { cookies } from 'next/headers'
import { ADMIN_2FA_COOKIE_NAME } from '@/lib/auth/two-factor'

export async function POST() {
  const supabase = await createClient()
  const cookieStore = await cookies()
  cookieStore.delete(ADMIN_2FA_COOKIE_NAME)

  const { error } = await supabase.auth.signOut()
  if (error) {
    return apiError('Sign-out failed', 500)
  }

  return apiSuccess({ ok: true })
}
