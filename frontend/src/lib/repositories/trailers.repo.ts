import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import { conflict, notFound } from '@/lib/errors'

export type TrailerRow = Database['public']['Tables']['trailers']['Row']
export type TrailerInsert = Omit<TrailerRow, 'id' | 'created_at' | 'updated_at'>
export type TrailerUpdate = Partial<TrailerInsert>

export async function findTrailersByCustomer(
  supabase: SupabaseClient<Database>,
  customer_id: string,
  includeInactive = false
): Promise<TrailerRow[]> {
  let query = supabase
    .from('trailers')
    .select('*')
    .eq('customer_id', customer_id)
    .is('deleted_at', null)
    .order('unit_number')

  if (!includeInactive) {
    query = query.eq('active', true)
  }

  const { data, error } = await query
  if (error) throw new Error(`trailers.findByCustomer: ${error.message}`)
  return data ?? []
}

export async function findTrailerById(
  supabase: SupabaseClient<Database>,
  id: string
): Promise<TrailerRow | null> {
  const { data, error } = await supabase
    .from('trailers')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) throw new Error(`trailers.findById: ${error.message}`)
  return data
}

export async function ensureTrailerBelongsToCustomer(
  supabase: SupabaseClient<Database>,
  trailerId: string,
  customerId: string
): Promise<TrailerRow> {
  const trailer = await findTrailerById(supabase, trailerId)
  if (!trailer) throw notFound('Trailer not found')
  if (trailer.customer_id !== customerId) throw conflict('Trailer does not belong to the selected customer')
  return trailer
}

export async function createTrailer(
  supabase: SupabaseClient<Database>,
  values: TrailerInsert
): Promise<TrailerRow> {
  const { data, error } = await supabase
    .from('trailers')
    .insert(values)
    .select()
    .single()

  if (error) throw new Error(`trailers.create: ${error.message}`)
  return data
}

export async function updateTrailer(
  supabase: SupabaseClient<Database>,
  id: string,
  values: TrailerUpdate
): Promise<TrailerRow> {
  const { data, error } = await supabase
    .from('trailers')
    .update(values)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(`trailers.update: ${error.message}`)
  return data
}

export async function deleteTrailer(
  supabase: SupabaseClient<Database>,
  id: string
): Promise<void> {
  const { count, error: ordersError } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('trailer_id', id)
    .is('deleted_at', null)

  if (ordersError) throw new Error(`trailers.delete.orderCount: ${ordersError.message}`)
  if ((count ?? 0) > 0) throw conflict('Cannot delete a trailer that is assigned to active orders')

  const { error } = await supabase
    .from('trailers')
    .update({ deleted_at: new Date().toISOString(), active: false })
    .eq('id', id)

  if (error) throw new Error(`trailers.delete: ${error.message}`)
}
