import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import { conflict, notFound } from '@/lib/errors'

export type VehicleRow = Database['public']['Tables']['vehicles']['Row']
export type VehicleInsert = Omit<VehicleRow, 'id' | 'created_at' | 'updated_at'>
export type VehicleUpdate = Partial<VehicleInsert>

export async function findVehiclesByCustomer(
  supabase: SupabaseClient<Database>,
  customer_id: string
): Promise<VehicleRow[]> {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('customer_id', customer_id)
    .order('unit_number')

  if (error) throw new Error(`vehicles.findByCustomer: ${error.message}`)
  return data ?? []
}

export async function createVehicle(
  supabase: SupabaseClient<Database>,
  values: VehicleInsert
): Promise<VehicleRow> {
  const { data, error } = await supabase
    .from('vehicles')
    .insert(values)
    .select()
    .single()

  if (error) throw new Error(`vehicles.create: ${error.message}`)
  return data
}

export async function findVehicleById(
  supabase: SupabaseClient<Database>,
  id: string
): Promise<VehicleRow | null> {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(`vehicles.findById: ${error.message}`)
  return data
}

export async function ensureVehicleBelongsToCustomer(
  supabase: SupabaseClient<Database>,
  vehicleId: string,
  customerId: string
): Promise<VehicleRow> {
  const vehicle = await findVehicleById(supabase, vehicleId)
  if (!vehicle) throw notFound('Vehicle not found')
  if (vehicle.customer_id !== customerId) {
    throw conflict('Vehicle does not belong to the selected customer')
  }
  return vehicle
}

export async function updateVehicle(
  supabase: SupabaseClient<Database>,
  id: string,
  values: VehicleUpdate
): Promise<VehicleRow> {
  const { data, error } = await supabase
    .from('vehicles')
    .update(values)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(`vehicles.update: ${error.message}`)
  return data
}

export async function deleteVehicle(
  supabase: SupabaseClient<Database>,
  id: string
): Promise<void> {
  const { count, error: ordersError } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('vehicle_id', id)

  if (ordersError) throw new Error(`vehicles.delete.orderCount: ${ordersError.message}`)
  if ((count ?? 0) > 0) {
    throw conflict('Cannot delete a vehicle that is assigned to existing orders')
  }

  const { error } = await supabase.from('vehicles').delete().eq('id', id)
  if (error) throw new Error(`vehicles.delete: ${error.message}`)
}
