import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateCredential, deleteCredential, ensureCredentialExists } from '@/lib/repositories/credentials.repo'
import { logAdminAction } from '@/lib/repositories/admin-audit.repo'
import { credentialSchema } from '@/lib/validators/credential.schema'
import { requireAdmin } from '@/lib/auth/assertAdmin'
import { apiNoContent, apiSuccess, handleApiError, parseWithSchema } from '@/lib/http/admin'
import { uuidParamSchema } from '@/lib/validators/admin-api.schema'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  try {
    const { user, role } = await requireAdmin(supabase, ['owner', 'admin'])
    const id = parseWithSchema(uuidParamSchema, params.id)
    const current = await ensureCredentialExists(supabase, id)
    const parsed = parseWithSchema(credentialSchema.partial(), await request.json())
    const data = await updateCredential(supabase, id, {
      username: parsed.username?.trim(),
      password: parsed.password,
      notes: parsed.notes?.trim() || (parsed.notes === '' ? null : undefined),
    })
    await logAdminAction(supabase, {
      actor_user_id: user.id,
      actor_role: role,
      action: 'credential.update',
      target_table: 'customer_credentials',
      target_id: id,
      metadata: {
        customer_id: current.customer_id,
        jurisdiction: current.jurisdiction,
        password_changed: parsed.password !== undefined,
      },
    })
    return apiSuccess(data)
  } catch (err) {
    return handleApiError(err)
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  try {
    const { user, role } = await requireAdmin(supabase, ['owner', 'admin'])
    const id = parseWithSchema(uuidParamSchema, params.id)
    const current = await ensureCredentialExists(supabase, id)
    await deleteCredential(supabase, id)
    await logAdminAction(supabase, {
      actor_user_id: user.id,
      actor_role: role,
      action: 'credential.delete',
      target_table: 'customer_credentials',
      target_id: id,
      metadata: { customer_id: current.customer_id, jurisdiction: current.jurisdiction },
    })
    return apiNoContent()
  } catch (err) {
    return handleApiError(err)
  }
}
