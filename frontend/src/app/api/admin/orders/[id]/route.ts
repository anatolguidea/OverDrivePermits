import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { findOrderById, updateOrderStatus, findOrderReferenceById, softDeleteOrder } from '@/lib/repositories/orders.repo'
import { updateOrderSchema } from '@/lib/validators/order.schema'
import { requireAdmin } from '@/lib/auth/assertAdmin'
import { apiNoContent, apiSuccess, handleApiError, parseWithSchema } from '@/lib/http/admin'
import { notFound } from '@/lib/errors'
import type { Database } from '@/lib/supabase/types'
import { uuidParamSchema } from '@/lib/validators/admin-api.schema'
import { logAdminAction } from '@/lib/repositories/admin-audit.repo'

type OrderUpdatePayload = Database['public']['Tables']['orders']['Update']

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  try {
    await requireAdmin(supabase, ['owner', 'admin', 'dispatcher'])
    const id = parseWithSchema(uuidParamSchema, params.id)
    const data = await findOrderById(supabase, id)
    if (!data) throw notFound('Order not found')
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
    const current = await findOrderReferenceById(supabase, id)
    if (!current) throw notFound('Order not found')
    const parsed = parseWithSchema(updateOrderSchema, await request.json())

    if (parsed.status) {
      await updateOrderStatus(supabase, id, parsed.status)
    } else {
      const patch: OrderUpdatePayload = {}
      if (parsed.truck_id !== undefined) patch.truck_id = parsed.truck_id ?? null
      if (parsed.trailer_id !== undefined) patch.trailer_id = parsed.trailer_id ?? null
      if (parsed.origin !== undefined) patch.origin = parsed.origin || null
      if (parsed.destination !== undefined) patch.destination = parsed.destination || null
      if (parsed.trip_date !== undefined) patch.trip_date = parsed.trip_date || null
      if (parsed.notes !== undefined) patch.notes = parsed.notes || null

      const { error } = await supabase.from('orders').update(patch).eq('id', id)
      if (error) throw new Error(error.message)
    }
    const data = await findOrderById(supabase, id)
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
    const current = await findOrderReferenceById(supabase, id)
    if (!current) throw notFound('Order not found')

    await softDeleteOrder(supabase, id)
    await logAdminAction(supabase, {
      actor_user_id: user.id,
      actor_role: role,
      action: 'order.delete',
      target_table: 'orders',
      target_id: id,
      metadata: {
        customer_id: current.customer_id,
        truck_id: current.truck_id,
        trailer_id: current.trailer_id,
      },
    })

    return apiNoContent()
  } catch (err) {
    return handleApiError(err)
  }
}
