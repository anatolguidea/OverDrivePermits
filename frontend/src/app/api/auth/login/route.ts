import 'server-only'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/auth/rate-limit'
import { recordSuccessfulLogin } from '@/lib/auth/lockout'
import { apiSuccess, apiError } from '@/lib/http/admin'
import {
  ADMIN_2FA_COOKIE_NAME,
  isTwoFactorRequiredRole,
} from '@/lib/auth/two-factor'
import { normalizeAdminRole } from '@/lib/auth/roles'
import { isAdminDashboardRole } from '@/lib/auth/policy'
import { z } from 'zod'
import { cookies } from 'next/headers'
import type { LoginErrorCode, LoginSuccessStatus } from '@/lib/auth/auth-flow'
import { ensureCriticalEnvConfigured } from '@/lib/config/env'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function POST(request: NextRequest) {
  ensureCriticalEnvConfigured()
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'

  // IP-based rate limit: 20 attempts per 60 s
  const ipAllowed = await checkRateLimit(`login:ip:${ip}`, { limit: 20, windowSeconds: 60 })
  if (!ipAllowed) {
    return authError('Too many requests. Please try again later.', 'RATE_LIMITED', 429)
  }

  const body = await request.json().catch(() => null)
  const parsed = loginSchema.safeParse(body)
  if (!parsed.success) {
    return authError('Invalid request', 'INVALID_REQUEST', 400)
  }

  const { email, password } = parsed.data

  // Email-based rate limit: 10 failures per 15 min (constant-time to avoid user enumeration)
  const emailAllowed = await checkRateLimit(`login:email:${email.toLowerCase()}`, { limit: 10, windowSeconds: 900 })
  if (!emailAllowed) {
    return authError('Too many login attempts. Please try again later.', 'RATE_LIMITED', 429)
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error || !data.user) {
    return authError('Invalid email or password', 'INVALID_CREDENTIALS', 401)
  }

  await recordSuccessfulLogin(supabase, data.user.id)

  const { data: admin } = await supabase
    .from('admins')
    .select('role')
    .eq('user_id', data.user.id)
    .maybeSingle()

  const role = admin?.role
  const canonicalRole = role ? normalizeAdminRole(role) : null
  if (!isAdminDashboardRole(canonicalRole)) {
    await supabase.auth.signOut()
    return authError('Only admin accounts can access this dashboard.', 'NOT_ADMIN', 403)
  }

  if (isTwoFactorRequiredRole(canonicalRole)) {
    const { data: profile } = await supabase
      .from('operator_profiles')
      .select('totp_secret_enc')
      .eq('user_id', data.user.id)
      .maybeSingle()

    const cookieStore = await cookies()
    cookieStore.delete(ADMIN_2FA_COOKIE_NAME)

    return authSuccess('MFA_REQUIRED', {
      user: { id: data.user.id, email: data.user.email },
      enrolled: Boolean(profile?.totp_secret_enc),
    })
  }

  return authSuccess('AUTHENTICATED', {
    user: { id: data.user.id, email: data.user.email },
  })
}

function authSuccess(status: LoginSuccessStatus, payload: Record<string, unknown>) {
  return apiSuccess({
    status,
    ...payload,
  })
}

function authError(error: string, code: LoginErrorCode, status = 500) {
  return apiError(error, status, { code })
}
