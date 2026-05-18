import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { findTruckById, updateTruck, deleteTruck } from '@/lib/repositories/trucks.repo'
import { logAdminAction } from '@/lib/repositories/admin-audit.repo'
import { truckSchema, normalizeTruck } from '@/lib/validators/truck.schema'
import { requireAdmin } from '@/lib/auth/assertAdmin'
import { apiNoContent, apiSuccess, handleApiError, parseWithSchema } from '@/lib/http/admin'
import { notFound } from '@/lib/errors'
import { uuidParamSchema } from '@/lib/validators/admin-api.schema'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  try {
    await requireAdmin(supabase, ['owner', 'admin', 'dispatcher'])
    const { id } = await params
    parseWithSchema(uuidParamSchema, id)
    const data = await findTruckById(supabase, id)
    if (!data) throw notFound('Truck not found')
    return apiSuccess(data)
  } catch (err) {
    return handleApiError(err)
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  try {
    await requireAdmin(supabase, ['owner', 'admin', 'dispatcher'])
    const { id } = await params
    parseWithSchema(uuidParamSchema, id)
    const truck = await findTruckById(supabase, id)
    if (!truck) throw notFound('Truck not found')
    const parsed = parseWithSchema(truckSchema.partial(), await request.json())
    const data = await updateTruck(supabase, id, normalizeTruck(parsed as Parameters<typeof normalizeTruck>[0]) as Parameters<typeof updateTruck>[2])
    return apiSuccess(data)
  } catch (err) {
    return handleApiError(err)
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  try {
    const { user, role } = await requireAdmin(supabase, ['owner', 'admin'])
    const { id } = await params
    parseWithSchema(uuidParamSchema, id)
    const truck = await findTruckById(supabase, id)
    if (!truck) throw notFound('Truck not found')
    await deleteTruck(supabase, id)
    await logAdminAction(supabase, {
      actor_user_id: user.id,
      actor_role:    role,
      action:        'truck.delete',
      target_table:  'trucks',
      target_id:     id,
      metadata:      { customer_id: truck.customer_id, unit_number: truck.unit_number },
    })
    return apiNoContent()
  } catch (err) {
    return handleApiError(err)
  }
}
