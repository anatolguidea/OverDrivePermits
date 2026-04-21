import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

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
  const { error } = await supabase.from('vehicles').delete().eq('id', id)
  if (error) throw new Error(`vehicles.delete: ${error.message}`)
}
