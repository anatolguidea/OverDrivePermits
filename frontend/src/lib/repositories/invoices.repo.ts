import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, InvoiceStatus } from '@/lib/supabase/types'
import type { NewInvoiceValues, UpdateInvoiceValues } from '@/lib/validators/invoice.schema'

export interface InvoiceRow {
  id: string
  invoice_number: string
  customer_id: string
  order_id: string | null
  subtotal: number
  tax: number
  total_amount: number
  status: InvoiceStatus
  issue_date: string
  due_date: string | null
  paid_at: string | null
  notes: string | null
  created_at: string
  customers: { id: string; name: string } | null
  orders: { id: string; order_number: string } | null
}

export interface LineItemRow {
  id: string
  invoice_id: string
  description: string
  quantity: number
  unit_price: number
  subtotal: number
  position: number
}

export interface InvoiceDetail extends InvoiceRow {
  invoice_line_items: LineItemRow[]
}

export interface InvoiceFilters {
  status?: InvoiceStatus | 'all'
  customer_id?: string
  search?: string
  page?: number
  page_size?: number
}

export interface InvoicesPage {
  data: InvoiceRow[]
  total: number
  page: number
  page_size: number
}

const INVOICE_LIST_SELECT = `
  id, invoice_number, customer_id, order_id, subtotal, tax, total_amount, status,
  issue_date, due_date, paid_at, notes, created_at,
  customers ( id, name ),
  orders ( id, order_number )
`

const INVOICE_DETAIL_SELECT = `
  id, invoice_number, customer_id, order_id, subtotal, tax, total_amount, status,
  issue_date, due_date, paid_at, notes, created_at,
  customers ( id, name ),
  orders ( id, order_number ),
  invoice_line_items ( id, description, quantity, unit_price, subtotal, position )
`

export async function findInvoices(
  supabase: SupabaseClient<Database>,
  filters: InvoiceFilters = {}
): Promise<InvoicesPage> {
  const { status, customer_id, search, page = 1, page_size = 25 } = filters
  const from = (page - 1) * page_size
  const to = from + page_size - 1

  let query = supabase
    .from('invoices')
    .select(INVOICE_LIST_SELECT, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }
  if (customer_id) {
    query = query.eq('customer_id', customer_id)
  }
  if (search) {
    query = query.ilike('invoice_number', `%${search}%`)
  }

  const { data, error, count } = await query

  if (error) throw new Error(`invoices.findInvoices: ${error.message}`)

  return {
    data: (data ?? []) as unknown as InvoiceRow[],
    total: count ?? 0,
    page,
    page_size,
  }
}

export async function findInvoiceById(
  supabase: SupabaseClient<Database>,
  id: string
): Promise<InvoiceDetail | null> {
  const { data, error } = await supabase
    .from('invoices')
    .select(INVOICE_DETAIL_SELECT)
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(`invoices.findInvoiceById: ${error.message}`)

  if (!data) return null

  const raw = data as unknown as InvoiceDetail & {
    invoice_line_items: LineItemRow[]
  }

  return {
    ...raw,
    invoice_line_items: [...(raw.invoice_line_items ?? [])].sort(
      (a, b) => a.position - b.position
    ),
  }
}

export async function createInvoice(
  supabase: SupabaseClient<Database>,
  data: NewInvoiceValues,
  userId: string
): Promise<InvoiceDetail> {
  const { line_items, ...invoiceData } = data

  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .insert({
      customer_id: invoiceData.customer_id,
      order_id: invoiceData.order_id ?? null,
      tax: invoiceData.tax,
      status: invoiceData.status,
      issue_date: invoiceData.issue_date,
      due_date: invoiceData.due_date || null,
      paid_at: null,
      notes: invoiceData.notes || null,
      created_by: userId,
      subtotal: 0,
    })
    .select('id')
    .single()

  if (invoiceError) throw new Error(`invoices.createInvoice: ${invoiceError.message}`)

  const lineItemsToInsert = line_items.map((item, index) => ({
    invoice_id: invoice.id,
    description: item.description,
    quantity: item.quantity,
    unit_price: item.unit_price,
    position: item.position ?? index,
  }))

  const { error: lineItemsError } = await supabase
    .from('invoice_line_items')
    .insert(lineItemsToInsert)

  if (lineItemsError) throw new Error(`invoices.createInvoice (line items): ${lineItemsError.message}`)

  const result = await findInvoiceById(supabase, invoice.id)
  if (!result) throw new Error('invoices.createInvoice: could not retrieve created invoice')

  return result
}

export async function updateInvoice(
  supabase: SupabaseClient<Database>,
  id: string,
  patch: UpdateInvoiceValues
): Promise<InvoiceRow> {
  const { data, error } = await supabase
    .from('invoices')
    .update(patch)
    .eq('id', id)
    .select(INVOICE_LIST_SELECT)
    .single()

  if (error) throw new Error(`invoices.updateInvoice: ${error.message}`)

  return data as unknown as InvoiceRow
}

export async function deleteInvoice(
  supabase: SupabaseClient<Database>,
  id: string
): Promise<void> {
  const { error } = await supabase
    .from('invoices')
    .delete()
    .eq('id', id)

  if (error) throw new Error(`invoices.deleteInvoice: ${error.message}`)
}
