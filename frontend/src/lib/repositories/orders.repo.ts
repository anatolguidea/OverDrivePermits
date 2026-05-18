import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, OrderStatus, PermitStatus, InvoiceStatus, Json } from '@/lib/supabase/types'
import { conflict, notFound } from '@/lib/errors'

export interface OrderRow {
  id: string
  order_number: string
  status: OrderStatus
  driver_name: string | null
  origin: string | null
  destination: string | null
  route_states: string[]
  trip_date: string | null
  dimensions: Json | null
  service_fee_cents: number
  notes: string | null
  created_at: string
  updated_at: string
  customers: { id: string; name: string; usdot: string | null }
  trucks: { id: string; unit_number: string; make: string | null; year: number | null } | null
  trailers: { id: string; unit_number: string; trailer_type: string | null } | null
  permits: Array<{ id: string; jurisdiction: string; status: PermitStatus; cost: number | null; sort_order: number; permit_number: string | null; document_url: string | null }>
  invoices: Array<{ id: string; status: InvoiceStatus; total_amount: number }>
}

export interface OrderReferenceRow {
  id: string
  customer_id: string
  truck_id: string | null
  trailer_id: string | null
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
  id, order_number, status, driver_name, origin, destination, route_states,
  trip_date, dimensions, service_fee_cents, notes, created_at, updated_at,
  customers ( id, name, usdot ),
  trucks ( id, unit_number, make, year ),
  trailers ( id, unit_number, trailer_type ),
  permits ( id, jurisdiction, status, cost, sort_order, permit_number, document_url ),
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
    .is('deleted_at', null)
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
  if (search) {
    query = query.ilike('order_number', `%${search}%`)
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

export async function findOrderReferenceById(
  supabase: SupabaseClient<Database>,
  id: string
): Promise<OrderReferenceRow | null> {
  const { data, error } = await supabase
    .from('orders')
    .select('id, customer_id, truck_id, trailer_id')
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(`orders.findOrderReferenceById: ${error.message}`)
  return data
}

export async function ensureOrderBelongsToCustomer(
  supabase: SupabaseClient<Database>,
  orderId: string,
  customerId: string
): Promise<OrderReferenceRow> {
  const order = await findOrderReferenceById(supabase, orderId)
  if (!order) throw notFound('Order not found')
  if (order.customer_id !== customerId) throw conflict('Order does not belong to the selected customer')
  return order
}

export async function softDeleteOrder(
  supabase: SupabaseClient<Database>,
  id: string
): Promise<void> {
  const { error } = await supabase
    .from('orders')
    .update({ deleted_at: new Date().toISOString(), status: 'cancelled' })
    .eq('id', id)

  if (error) throw new Error(`orders.softDelete: ${error.message}`)
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
