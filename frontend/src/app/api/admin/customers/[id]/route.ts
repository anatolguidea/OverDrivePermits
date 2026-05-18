import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { findCustomerById, updateCustomer, deleteCustomer, ensureCustomerExists } from '@/lib/repositories/customers.repo'
import { logAdminAction } from '@/lib/repositories/admin-audit.repo'
import { customerSchema, normalizeCustomer } from '@/lib/validators/customer.schema'
import { requireAdmin } from '@/lib/auth/assertAdmin'
import { apiNoContent, apiSuccess, handleApiError, parseWithSchema } from '@/lib/http/admin'
import { uuidParamSchema } from '@/lib/validators/admin-api.schema'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  try {
    await requireAdmin(supabase, ['owner', 'admin', 'dispatcher'])
    const id = parseWithSchema(uuidParamSchema, params.id)
    const data = await ensureCustomerExists(supabase, id)
    return apiSuccess(data)
  } catch (err) {
    return handleApiError(err)
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  try {
    await requireAdmin(supabase, ['owner', 'admin', 'dispatcher'])
    const id = parseWithSchema(uuidParamSchema, params.id)
    await ensureCustomerExists(supabase, id)
    const parsed = parseWithSchema(customerSchema.partial(), await request.json())
    const data = await updateCustomer(supabase, params.id, normalizeCustomer(parsed as Parameters<typeof normalizeCustomer>[0]) as Record<string, string | null>)
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
    const customer = await ensureCustomerExists(supabase, id)
    await deleteCustomer(supabase, id)
    await logAdminAction(supabase, {
      actor_user_id: user.id,
      actor_role: role,
      action: 'customer.delete',
      target_table: 'customers',
      target_id: id,
      metadata: { customer_name: customer.name },
    })
    return apiNoContent()
  } catch (err) {
    return handleApiError(err)
  }
}
