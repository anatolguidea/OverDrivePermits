import 'server-only'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/assertAdmin'
import { apiError, apiSuccess, handleApiError } from '@/lib/http/admin'
import { generateSecret, generateURI } from 'otplib'
import { encryptPassword } from '@/lib/crypto/credentials'
import { ensureCriticalEnvConfigured } from '@/lib/config/env'
import { isTwoFactorEnabled } from '@/lib/auth/policy'

/** Returns whether the current user has 2FA enrolled. */
export async function GET(_: NextRequest) {
  ensureCriticalEnvConfigured()
  if (!isTwoFactorEnabled()) {
    return apiSuccess({ enabled: false, enrolled: false })
  }

  const supabase = await createClient()
  try {
    const { user } = await requireAdmin(supabase, { allowUnverifiedTwoFactor: true })
    const { data } = await supabase
      .from('operator_profiles')
      .select('totp_secret_enc')
      .eq('user_id', user.id)
      .maybeSingle()
    return apiSuccess({ enabled: true, enrolled: !!data?.totp_secret_enc })
  } catch (err) {
    return handleApiError(err)
  }
}

/** Generates a new TOTP secret, stores it encrypted, returns the otpauth URI for QR display. */
export async function POST(_: NextRequest) {
  ensureCriticalEnvConfigured()
  if (!isTwoFactorEnabled()) {
    return apiError('2FA is not enabled', 400)
  }

  const supabase = await createClient()
  try {
    const { user } = await requireAdmin(supabase, { allowUnverifiedTwoFactor: true })

    const secret = generateSecret()
    const uri = generateURI({
      issuer: 'OSW Permits',
      label: user.email ?? user.id,
      secret,
    })
    const encrypted = encryptPassword(secret)

    await supabase
      .from('operator_profiles')
      .upsert(
        { user_id: user.id, totp_secret_enc: JSON.stringify(encrypted) },
        { onConflict: 'user_id' }
      )
    return apiSuccess({ uri, secret })
  } catch (err) {
    return handleApiError(err)
  }
}

/** Removes the stored TOTP secret, disabling 2FA for this user. */
export async function DELETE(_: NextRequest) {
  ensureCriticalEnvConfigured()
  if (!isTwoFactorEnabled()) {
    return apiSuccess({ ok: true, enabled: false })
  }

  const supabase = await createClient()
  try {
    const { user } = await requireAdmin(supabase, { allowUnverifiedTwoFactor: true })
    await supabase
      .from('operator_profiles')
      .update({ totp_secret_enc: null })
      .eq('user_id', user.id)
    return apiSuccess({ ok: true })
  } catch (err) {
    return handleApiError(err)
  }
}
