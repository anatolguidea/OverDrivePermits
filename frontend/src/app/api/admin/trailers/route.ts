import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { findTrailersByCustomer, createTrailer } from '@/lib/repositories/trailers.repo'
import { ensureCustomerExists } from '@/lib/repositories/customers.repo'
import { trailerSchema, normalizeTrailer } from '@/lib/validators/trailer.schema'
import { requireAdmin } from '@/lib/auth/assertAdmin'
import { apiCreated, apiSuccess, handleApiError, parseWithSchema } from '@/lib/http/admin'
import { customerScopedQuerySchema } from '@/lib/validators/admin-api.schema'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  try {
    await requireAdmin(supabase, ['owner', 'admin', 'dispatcher'])
    const { customer_id } = parseWithSchema(
      customerScopedQuerySchema,
      Object.fromEntries(request.nextUrl.searchParams)
    )
    const data = await findTrailersByCustomer(supabase, customer_id)
    return apiSuccess(data)
  } catch (err) {
    return handleApiError(err)
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  try {
    await requireAdmin(supabase, ['owner', 'admin', 'dispatcher'])
    const body = await request.json()
    const { customer_id, ...rest } = body
    const scoped = parseWithSchema(customerScopedQuerySchema, { customer_id })
    await ensureCustomerExists(supabase, scoped.customer_id)
    const parsed = parseWithSchema(trailerSchema, rest)
    const normalized = normalizeTrailer(parsed)
    const data = await createTrailer(supabase, {
      ...normalized,
      customer_id: scoped.customer_id,
    } as Parameters<typeof createTrailer>[1])
    return apiCreated(data)
  } catch (err) {
    return handleApiError(err)
  }
}
