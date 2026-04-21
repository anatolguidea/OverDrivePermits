import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { findOrders, type OrderFilters } from '@/lib/repositories/orders.repo'
import { newOrderSchema } from '@/lib/validators/order.schema'
import type { OrderStatus } from '@/lib/supabase/types'

async function assertAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('admins').select('user_id').eq('user_id', user.id).maybeSingle()
  return data ? user : null
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  if (!(await assertAdmin(supabase))) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const sp = request.nextUrl.searchParams

  const filters: OrderFilters = {
    status: (sp.get('status') as OrderStatus | 'all') || 'all',
    customer_id: sp.get('customer_id') || undefined,
    date_from: sp.get('date_from') || undefined,
    date_to: sp.get('date_to') || undefined,
    search: sp.get('search') || undefined,
    page: sp.get('page') ? Number(sp.get('page')) : 1,
    page_size: sp.get('page_size') ? Number(sp.get('page_size')) : 25,
  }

  try {
    const result = await findOrders(supabase, filters)
    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const user = await assertAdmin(supabase)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()

  // Validate shape of incoming payload
  const parsed = newOrderSchema.safeParse(body.order
    ? { ...body.order, permits: body.permits }
    : body
  )
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 422 })
  }

  try {
    const { data, error } = await supabase.rpc('create_order_with_permits', {
      p_order: {
        customer_id:  parsed.data.customer_id,
        vehicle_id:   parsed.data.vehicle_id || null,
        status:       parsed.data.status,
        origin:       parsed.data.origin || null,
        destination:  parsed.data.destination || null,
        route_states: parsed.data.permits.map((p) => p.state_code),
        trip_date:    parsed.data.trip_date || null,
        notes:        parsed.data.notes || null,
        created_by:   user.id,
      },
      p_permits: parsed.data.permits.map((p) => ({
        state_code: p.state_code,
        cost:       p.cost ?? null,
      })),
    })

    if (error) throw new Error(error.message)
    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
