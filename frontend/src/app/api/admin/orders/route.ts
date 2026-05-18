import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { findOrders } from '@/lib/repositories/orders.repo'
import { ensureCustomerExists } from '@/lib/repositories/customers.repo'
import { newOrderSchema } from '@/lib/validators/order.schema'
import { requireAdmin } from '@/lib/auth/assertAdmin'
import { apiCreated, apiPage, handleApiError, parseWithSchema } from '@/lib/http/admin'
import { conflict } from '@/lib/errors'
import { ordersListQuerySchema } from '@/lib/validators/admin-api.schema'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  try {
    await requireAdmin(supabase)
    const filters = parseWithSchema(
      ordersListQuerySchema,
      Object.fromEntries(request.nextUrl.searchParams)
    )
    const result = await findOrders(supabase, filters)
    return apiPage(result, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    return handleApiError(err)
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  try {
    const { user } = await requireAdmin(supabase, ['owner', 'admin', 'dispatcher'])
    const body = await request.json()
    const parsed = parseWithSchema(
      newOrderSchema,
      body.order ? { ...body.order, permits: body.permits } : body
    )
    await ensureCustomerExists(supabase, parsed.customer_id)

    const permits = parsed.permits.map((permit) => ({
      ...permit,
      jurisdiction: permit.jurisdiction.trim().toUpperCase(),
    }))

    const uniqueJurisdictions = new Set(permits.map((permit) => permit.jurisdiction))
    if (uniqueJurisdictions.size !== permits.length) {
      throw conflict('Duplicate permit jurisdictions are not allowed')
    }

    const { data, error } = await supabase.rpc('create_order_with_permits', {
      p_order: {
        customer_id: parsed.customer_id,
        truck_id: parsed.truck_id || null,
        trailer_id: parsed.trailer_id || null,
        status: parsed.status,
        origin: parsed.origin || null,
        destination: parsed.destination || null,
        route_states: permits.map((permit) => permit.jurisdiction),
        trip_date: parsed.trip_date || null,
        notes: parsed.notes || null,
        created_by: user.id,
      },
      p_permits: permits.map((permit) => ({
        jurisdiction: permit.jurisdiction,
        cost: permit.cost ?? null,
      })),
    })

    if (error) throw new Error(error.message)
    return apiCreated(data)
  } catch (err) {
    return handleApiError(err)
  }
}
