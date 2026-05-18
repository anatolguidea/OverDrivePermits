import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateVehicle, deleteVehicle, findVehicleById } from '@/lib/repositories/vehicles.repo'
import { logAdminAction } from '@/lib/repositories/admin-audit.repo'
import { vehicleSchema, normalizeVehicle } from '@/lib/validators/vehicle.schema'
import { requireAdmin } from '@/lib/auth/assertAdmin'
import { apiNoContent, apiSuccess, handleApiError, parseWithSchema } from '@/lib/http/admin'
import { notFound } from '@/lib/errors'
import { uuidParamSchema } from '@/lib/validators/admin-api.schema'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  try {
    await requireAdmin(supabase, ['owner', 'admin', 'dispatcher'])
    const id = parseWithSchema(uuidParamSchema, params.id)
    const vehicle = await findVehicleById(supabase, id)
    if (!vehicle) throw notFound('Vehicle not found')
    const parsed = parseWithSchema(vehicleSchema.partial(), await request.json())
    const data = await updateVehicle(supabase, params.id, normalizeVehicle(parsed as Parameters<typeof normalizeVehicle>[0]) as Parameters<typeof updateVehicle>[2])
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
    const vehicle = await findVehicleById(supabase, id)
    if (!vehicle) throw notFound('Vehicle not found')
    await deleteVehicle(supabase, id)
    await logAdminAction(supabase, {
      actor_user_id: user.id,
      actor_role: role,
      action: 'truck.delete',
      target_table: 'trucks',
      target_id: id,
      metadata: { customer_id: vehicle.customer_id, unit_number: vehicle.unit_number },
    })
    return apiNoContent()
  } catch (err) {
    return handleApiError(err)
  }
}
