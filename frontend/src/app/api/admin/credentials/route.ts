import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { findCredentialsByCustomer, createCredential } from '@/lib/repositories/credentials.repo'
import { ensureCustomerExists } from '@/lib/repositories/customers.repo'
import { logAdminAction } from '@/lib/repositories/admin-audit.repo'
import { credentialSchema } from '@/lib/validators/credential.schema'
import { requireAdmin } from '@/lib/auth/assertAdmin'
import { apiCreated, apiSuccess, handleApiError, parseWithSchema } from '@/lib/http/admin'
import { customerScopedQuerySchema } from '@/lib/validators/admin-api.schema'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  try {
    await requireAdmin(supabase)
    const { customer_id } = parseWithSchema(
      customerScopedQuerySchema,
      Object.fromEntries(request.nextUrl.searchParams)
    )
    const data = await findCredentialsByCustomer(supabase, customer_id)
    return apiSuccess(data)
  } catch (err) {
    return handleApiError(err)
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  try {
    const { user, role } = await requireAdmin(supabase, ['owner', 'admin'])
    const body = await request.json()
    const { customer_id, ...rest } = body
    const scoped = parseWithSchema(customerScopedQuerySchema, { customer_id })
    await ensureCustomerExists(supabase, scoped.customer_id)
    const parsed = parseWithSchema(credentialSchema, rest)
    const data = await createCredential(supabase, {
      customer_id:  scoped.customer_id,
      jurisdiction: parsed.jurisdiction.trim(),
      username:     parsed.username.trim(),
      password:     parsed.password,
      notes:        parsed.notes?.trim() || null,
    })
    await logAdminAction(supabase, {
      actor_user_id: user.id,
      actor_role:    role,
      action:        'credential.create',
      target_table:  'customer_credentials',
      target_id:     data.id,
      metadata:      { customer_id: data.customer_id, jurisdiction: data.jurisdiction, username: data.username },
    })
    return apiCreated(data)
  } catch (err) {
    return handleApiError(err)
  }
}
