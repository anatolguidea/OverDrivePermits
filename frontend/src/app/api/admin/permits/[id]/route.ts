import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updatePermit, assertValidTransition } from '@/lib/repositories/permits.repo'
import { logAdminAction } from '@/lib/repositories/admin-audit.repo'
import { updatePermitSchema } from '@/lib/validators/permit.schema'
import { requireAdmin } from '@/lib/auth/assertAdmin'
import { apiSuccess, handleApiError, parseWithSchema } from '@/lib/http/admin'
import { notFound } from '@/lib/errors'
import type { PermitStatus } from '@/lib/supabase/types'
import { uuidParamSchema } from '@/lib/validators/admin-api.schema'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  try {
    const { user, role } = await requireAdmin(supabase, ['owner', 'admin', 'dispatcher'])
    const id = parseWithSchema(uuidParamSchema, params.id)
    const parsed = parseWithSchema(updatePermitSchema, await request.json())

    const { data: current } = await supabase
      .from('permits')
      .select('id, status, order_id, state_code, permit_number')
      .eq('id', id)
      .maybeSingle()

    if (!current) throw notFound('Permit not found')

    if (parsed.status) {
      assertValidTransition(current.status as PermitStatus, parsed.status as PermitStatus)
    }

    const data = await updatePermit(supabase, id, {
      ...(parsed.status && { status: parsed.status }),
      ...(parsed.cost !== undefined && { cost: parsed.cost }),
      ...(parsed.permit_number !== undefined && { permit_number: parsed.permit_number || null }),
      ...(parsed.issue_date !== undefined && { issue_date: parsed.issue_date || null }),
    })

    if (parsed.status && parsed.status !== current.status) {
      await logAdminAction(supabase, {
        actor_user_id: user.id,
        actor_role: role,
        action: 'permit.status.change',
        target_table: 'permits',
        target_id: id,
        metadata: {
          order_id: current.order_id,
          state_code: current.state_code,
          from_status: current.status,
          to_status: parsed.status,
        },
      })
    }

    return apiSuccess(data)
  } catch (err) {
    return handleApiError(err)
  }
}
