import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, OrderStatus, PermitStatus, InvoiceStatus, VehicleType } from '@/lib/supabase/types'

export interface OrderRow {
  id: string
  order_number: string
  status: OrderStatus
  origin: string | null
  destination: string | null
  route_states: string[]
  trip_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
  customers: { id: string; name: string; usdot: string | null }
  vehicles: { id: string; unit_number: string; vehicle_type: VehicleType; make: string | null; year: number | null } | null
  permits: Array<{ state_code: string; status: PermitStatus; cost: number | null }>
  invoices: Array<{ id: string; status: InvoiceStatus; total_amount: number }>
}

export interface OrderFilters {
  status?: OrderStatus | 'all'
  customer_id?: string
  date_from?: string
  date_to?: string
  search?: string
  page?: number
  page_size?: number
}

export interface OrdersPage {
  data: OrderRow[]
  total: number
  page: number
  page_size: number
}

const ORDER_SELECT = `
  id, order_number, status, origin, destination, route_states, trip_date, notes, created_at, updated_at,
  customers ( id, name, usdot ),
  vehicles ( id, unit_number, vehicle_type, make, year ),
  permits ( state_code, status, cost ),
  invoices ( id, status, total_amount )
`

export async function findOrders(
  supabase: SupabaseClient<Database>,
  filters: OrderFilters = {}
): Promise<OrdersPage> {
  const { status, customer_id, date_from, date_to, search, page = 1, page_size = 25 } = filters
  const from = (page - 1) * page_size
  const to = from + page_size - 1

  let query = supabase
    .from('orders')
    .select(ORDER_SELECT, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }
  if (customer_id) {
    query = query.eq('customer_id', customer_id)
  }
  if (date_from) {
    query = query.gte('trip_date', date_from)
  }
  if (date_to) {
    query = query.lte('trip_date', date_to)
  }

  const { data, error, count } = await query

  if (error) throw new Error(`orders.findOrders: ${error.message}`)

  return {
    data: (data ?? []) as unknown as OrderRow[],
    total: count ?? 0,
    page,
    page_size,
  }
}

export async function findOrderById(
  supabase: SupabaseClient<Database>,
  id: string
): Promise<OrderRow | null> {
  const { data, error } = await supabase
    .from('orders')
    .select(ORDER_SELECT)
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(`orders.findOrderById: ${error.message}`)
  return data as unknown as OrderRow | null
}

export async function updateOrderStatus(
  supabase: SupabaseClient<Database>,
  id: string,
  status: OrderStatus
): Promise<void> {
  const { error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', id)

  if (error) throw new Error(`orders.updateOrderStatus: ${error.message}`)
}
