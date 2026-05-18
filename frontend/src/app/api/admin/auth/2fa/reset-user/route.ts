import 'server-only'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/assertAdmin'
import { apiSuccess, handleApiError, parseWithSchema } from '@/lib/http/admin'
import { logAdminAction } from '@/lib/repositories/admin-audit.repo'
import { ensureCriticalEnvConfigured } from '@/lib/config/env'

const resetUserSchema = z.object({
  userId: z.string().uuid(),
  reason: z.string().trim().min(8).max(500),
})

export async function POST(request: Request) {
  ensureCriticalEnvConfigured()
  const supabase = await createClient()

  try {
    const { user, role, ip, userAgent } = await requireAdmin(supabase, ['owner'])
    const { userId, reason } = parseWithSchema(resetUserSchema, await request.json())

    const { error: profileErr } = await supabase
      .from('operator_profiles')
      .update({ totp_secret_enc: null })
      .eq('user_id', userId)

    if (profileErr) {
      throw new Error(`2fa.reset.profile: ${profileErr.message}`)
    }

    // Best-effort session invalidation so the target user must sign in and re-verify.
    try {
      const serviceSupabase = await createServiceClient()
      await serviceSupabase.auth.admin.signOut(userId, 'global')
    } catch {
      // No-op: enrollment reset already blocks 2FA gate until re-enrollment.
    }

    await logAdminAction(supabase, {
      actor_user_id: user.id,
      actor_role: role,
      action: 'auth.2fa.reset',
      target_table: 'operator_profiles',
      target_id: userId,
      metadata: { reason },
      ip,
      user_agent: userAgent,
    })

    return apiSuccess({ ok: true })
  } catch (err) {
    return handleApiError(err)
  }
}

