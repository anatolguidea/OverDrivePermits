import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import { conflict, notFound } from '@/lib/errors'

export type TruckRow = Database['public']['Tables']['trucks']['Row']
export type TruckInsert = Omit<TruckRow, 'id' | 'created_at' | 'updated_at'>
export type TruckUpdate = Partial<TruckInsert>

export async function findTrucksByCustomer(
  supabase: SupabaseClient<Database>,
  customer_id: string,
  includeInactive = false
): Promise<TruckRow[]> {
  let query = supabase
    .from('trucks')
    .select('*')
    .eq('customer_id', customer_id)
    .is('deleted_at', null)
    .order('unit_number')

  if (!includeInactive) {
    query = query.eq('active', true)
  }

  const { data, error } = await query
  if (error) throw new Error(`trucks.findByCustomer: ${error.message}`)
  return data ?? []
}

export async function findTruckById(
  supabase: SupabaseClient<Database>,
  id: string
): Promise<TruckRow | null> {
  const { data, error } = await supabase
    .from('trucks')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) throw new Error(`trucks.findById: ${error.message}`)
  return data
}

export async function ensureTruckBelongsToCustomer(
  supabase: SupabaseClient<Database>,
  truckId: string,
  customerId: string
): Promise<TruckRow> {
  const truck = await findTruckById(supabase, truckId)
  if (!truck) throw notFound('Truck not found')
  if (truck.customer_id !== customerId) throw conflict('Truck does not belong to the selected customer')
  return truck
}

export async function createTruck(
  supabase: SupabaseClient<Database>,
  values: TruckInsert
): Promise<TruckRow> {
  const { data, error } = await supabase
    .from('trucks')
    .insert(values)
    .select()
    .single()

  if (error) throw new Error(`trucks.create: ${error.message}`)
  return data
}

export async function updateTruck(
  supabase: SupabaseClient<Database>,
  id: string,
  values: TruckUpdate
): Promise<TruckRow> {
  const { data, error } = await supabase
    .from('trucks')
    .update(values)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(`trucks.update: ${error.message}`)
  return data
}

export async function deleteTruck(
  supabase: SupabaseClient<Database>,
  id: string
): Promise<void> {
  const { count, error: ordersError } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('truck_id', id)
    .is('deleted_at', null)

  if (ordersError) throw new Error(`trucks.delete.orderCount: ${ordersError.message}`)
  if ((count ?? 0) > 0) throw conflict('Cannot delete a truck that is assigned to active orders')

  const { error } = await supabase
    .from('trucks')
    .update({ deleted_at: new Date().toISOString(), active: false })
    .eq('id', id)

  if (error) throw new Error(`trucks.delete: ${error.message}`)
}
