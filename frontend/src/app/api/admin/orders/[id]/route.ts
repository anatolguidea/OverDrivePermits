import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { findOrderById, updateOrderStatus } from '@/lib/repositories/orders.repo'
import { updateOrderSchema } from '@/lib/validators/order.schema'
import { assertAdmin } from '@/lib/auth/assertAdmin'
import { getErrorMessage } from '@/lib/errors'
import type { Database } from '@/lib/supabase/types'

type OrderUpdatePayload = Database['public']['Tables']['orders']['Update']

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  if (!(await assertAdmin(supabase))) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const data = await findOrderById(supabase, params.id)
    if (!data) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    return NextResponse.json({ success: true, data })
  } catch (err) {
    return NextResponse.json({ success: false, error: getErrorMessage(err) }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  if (!(await assertAdmin(supabase))) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const parsed = updateOrderSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 422 })
  }

  try {
    if (parsed.data.status) {
      await updateOrderStatus(supabase, params.id, parsed.data.status)
    } else {
      const patch: OrderUpdatePayload = {}
      if (parsed.data.vehicle_id  !== undefined) patch.vehicle_id  = parsed.data.vehicle_id ?? null
      if (parsed.data.origin      !== undefined) patch.origin      = parsed.data.origin || null
      if (parsed.data.destination !== undefined) patch.destination = parsed.data.destination || null
      if (parsed.data.trip_date   !== undefined) patch.trip_date   = parsed.data.trip_date || null
      if (parsed.data.notes       !== undefined) patch.notes       = parsed.data.notes || null

      const { error } = await supabase.from('orders').update(patch).eq('id', params.id)
      if (error) throw new Error(error.message)
    }
    const data = await findOrderById(supabase, params.id)
    return NextResponse.json({ success: true, data })
  } catch (err) {
    return NextResponse.json({ success: false, error: getErrorMessage(err) }, { status: 500 })
  }
}
