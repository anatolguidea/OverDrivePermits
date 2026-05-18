import 'server-only'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/assertAdmin'
import { apiError, apiSuccess, handleApiError, parseWithSchema } from '@/lib/http/admin'
import { verifySync } from 'otplib'
import { decryptPassword } from '@/lib/crypto/credentials'
import { z } from 'zod'
import {
  ADMIN_2FA_COOKIE_MAX_AGE_SECONDS,
  ADMIN_2FA_COOKIE_NAME,
  buildTwoFactorCookieValue,
} from '@/lib/auth/two-factor'
import { normalizeAdminRole } from '@/lib/auth/roles'
import { cookies } from 'next/headers'
import { ensureCriticalEnvConfigured } from '@/lib/config/env'
import { isTwoFactorEnabled } from '@/lib/auth/policy'

const verifySchema = z.object({
  code: z.string().length(6).regex(/^\d{6}$/, 'Code must be 6 digits'),
})

export async function POST(request: NextRequest) {
  ensureCriticalEnvConfigured()
  if (!isTwoFactorEnabled()) {
    return apiError('2FA is not enabled', 400)
  }

  const supabase = await createClient()
  try {
    const { user, admin } = await requireAdmin(supabase, { allowUnverifiedTwoFactor: true })
    const { code } = parseWithSchema(verifySchema, await request.json())

    const { data } = await supabase
      .from('operator_profiles')
      .select('totp_secret_enc')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!data?.totp_secret_enc) {
      return apiError('2FA is not enrolled', 400)
    }

    const encrypted = JSON.parse(data.totp_secret_enc)
    const secret = decryptPassword(encrypted)
    // Allow 1 period (30 s) of tolerance to account for clock drift
    // epochTolerance: 30 s on each side to account for clock drift
    const result = verifySync({ secret, token: code, epochTolerance: 30 })

    if (!result.valid) {
      return apiError('Invalid code', 401)
    }

    const cookieStore = await cookies()
    cookieStore.set({
      name: ADMIN_2FA_COOKIE_NAME,
      value: buildTwoFactorCookieValue({
        userId: user.id,
        role: normalizeAdminRole(admin.role),
      }),
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: ADMIN_2FA_COOKIE_MAX_AGE_SECONDS,
    })

    return apiSuccess({ ok: true })
  } catch (err) {
    return handleApiError(err)
  }
}
