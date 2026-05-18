import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decryptCredential, ensureCredentialExists } from '@/lib/repositories/credentials.repo'
import { logAdminAction } from '@/lib/repositories/admin-audit.repo'
import { requireAdmin } from '@/lib/auth/assertAdmin'
import { handleApiError, parseWithSchema } from '@/lib/http/admin'
import { revealCredentialQuerySchema, uuidParamSchema } from '@/lib/validators/admin-api.schema'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  try {
    const { user, role } = await requireAdmin(supabase, ['owner', 'admin'])
    const id = parseWithSchema(uuidParamSchema, params.id)
    const { reason } = parseWithSchema(
      revealCredentialQuerySchema,
      Object.fromEntries(request.nextUrl.searchParams)
    )
    const credential = await ensureCredentialExists(supabase, id)
    const password = await decryptCredential(supabase, id)
    await logAdminAction(supabase, {
      actor_user_id: user.id,
      actor_role: role,
      action: 'credential.reveal',
      target_table: 'customer_credentials',
      target_id: id,
      metadata: {
        customer_id: credential.customer_id,
        jurisdiction: credential.jurisdiction,
        reason: reason ?? null,
      },
    })
    return NextResponse.json({ success: true, password })
  } catch (err) {
    return handleApiError(err)
  }
}
