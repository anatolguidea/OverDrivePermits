import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { findCustomers, createCustomer, type CustomerInsert } from '@/lib/repositories/customers.repo'
import { customerSchema, normalizeCustomer } from '@/lib/validators/customer.schema'
import { requireAdmin } from '@/lib/auth/assertAdmin'
import { apiCreated, apiPage, handleApiError, parseWithSchema } from '@/lib/http/admin'
import { customersListQuerySchema } from '@/lib/validators/admin-api.schema'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  try {
    await requireAdmin(supabase)
    const filters = parseWithSchema(
      customersListQuerySchema,
      Object.fromEntries(request.nextUrl.searchParams)
    )
    const result = await findCustomers(supabase, {
      search: filters.search,
      page: filters.page,
      page_size: filters.page_size,
    })
    return apiPage(result, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    return handleApiError(err)
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  try {
    const { user } = await requireAdmin(supabase, ['owner', 'admin', 'dispatcher'])
    const parsed = parseWithSchema(customerSchema, await request.json())
    const data = await createCustomer(supabase, {
      ...normalizeCustomer(parsed),
      created_by: user.id,
    } as CustomerInsert)
    return apiCreated(data)
  } catch (err) {
    return handleApiError(err)
  }
}
