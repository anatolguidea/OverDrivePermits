import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import { conflict, notFound } from '@/lib/errors'

export type CustomerRow = Database['public']['Tables']['customers']['Row']
export type CustomerInsert = Omit<CustomerRow, 'id' | 'created_at' | 'updated_at'>
export type CustomerUpdate = Partial<CustomerInsert>

export interface CustomerListRow {
  id: string
  name: string
  usdot: string | null
  mc_number: string | null
  email: string | null
  phone: string | null
  city: string | null
  state_code: string | null
  created_at: string
  _order_count: number
}

export interface CustomersPage {
  data: CustomerListRow[]
  total: number
  page: number
  page_size: number
}

export async function findCustomers(
  supabase: SupabaseClient<Database>,
  opts: { search?: string; page?: number; page_size?: number } = {}
): Promise<CustomersPage> {
  const { search, page = 1, page_size = 30 } = opts
  const from = (page - 1) * page_size
  const to = from + page_size - 1

  let query = supabase
    .from('customers')
    .select('id, name, usdot, mc_number, email, phone, city, state_code, created_at', { count: 'exact' })
    .order('name')
    .range(from, to)

  if (search) {
    query = query.or(`name.ilike.%${search}%,usdot.ilike.%${search}%,mc_number.ilike.%${search}%`)
  }

  const { data, error, count } = await query
  if (error) throw new Error(`customers.findCustomers: ${error.message}`)

  // Attach order count in a second lightweight query
  const ids = (data ?? []).map((c) => c.id)
  let orderCounts: Record<string, number> = {}
  if (ids.length) {
    const { data: orders } = await supabase
      .from('orders')
      .select('customer_id')
      .in('customer_id', ids)
    orders?.forEach((o) => {
      orderCounts[o.customer_id] = (orderCounts[o.customer_id] ?? 0) + 1
    })
  }

  return {
    data: (data ?? []).map((c) => ({ ...c, _order_count: orderCounts[c.id] ?? 0 })),
    total: count ?? 0,
    page,
    page_size,
  }
}

export async function findCustomerById(
  supabase: SupabaseClient<Database>,
  id: string
): Promise<CustomerRow | null> {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(`customers.findCustomerById: ${error.message}`)
  return data
}

export async function ensureCustomerExists(
  supabase: SupabaseClient<Database>,
  id: string
): Promise<CustomerRow> {
  const customer = await findCustomerById(supabase, id)
  if (!customer) throw notFound('Customer not found')
  return customer
}

export async function createCustomer(
  supabase: SupabaseClient<Database>,
  values: CustomerInsert
): Promise<CustomerRow> {
  const { data, error } = await supabase
    .from('customers')
    .insert(values)
    .select()
    .single()

  if (error) throw new Error(`customers.createCustomer: ${error.message}`)
  return data
}

export async function updateCustomer(
  supabase: SupabaseClient<Database>,
  id: string,
  values: CustomerUpdate
): Promise<CustomerRow> {
  const { data, error } = await supabase
    .from('customers')
    .update(values)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(`customers.updateCustomer: ${error.message}`)
  return data
}

export async function deleteCustomer(
  supabase: SupabaseClient<Database>,
  id: string
): Promise<void> {
  const [{ count: ordersCount, error: ordersError }, { count: invoicesCount, error: invoicesError }] =
    await Promise.all([
      supabase.from('orders').select('*', { count: 'exact', head: true }).eq('customer_id', id),
      supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('customer_id', id),
    ])

  if (ordersError) throw new Error(`customers.delete.ordersCount: ${ordersError.message}`)
  if (invoicesError) throw new Error(`customers.delete.invoicesCount: ${invoicesError.message}`)

  if ((ordersCount ?? 0) > 0 || (invoicesCount ?? 0) > 0) {
    throw conflict('Cannot delete a customer with existing orders or invoices')
  }

  const { error } = await supabase.from('customers').delete().eq('id', id)
  if (error) throw new Error(`customers.deleteCustomer: ${error.message}`)
}
