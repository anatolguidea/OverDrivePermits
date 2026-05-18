import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { findVehiclesByCustomer, createVehicle } from '@/lib/repositories/vehicles.repo'
import { ensureCustomerExists } from '@/lib/repositories/customers.repo'
import { vehicleSchema, normalizeVehicle } from '@/lib/validators/vehicle.schema'
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
    const data = await findVehiclesByCustomer(supabase, customer_id)
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
    const parsed = parseWithSchema(vehicleSchema, rest)
    const normalized = normalizeVehicle(parsed)
    const data = await createVehicle(supabase, { ...normalized, customer_id: scoped.customer_id } as Parameters<typeof createVehicle>[1])
    return apiCreated(data)
  } catch (err) {
    return handleApiError(err)
  }
}
