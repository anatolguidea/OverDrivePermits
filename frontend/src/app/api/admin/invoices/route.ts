import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { findInvoices, createInvoice } from '@/lib/repositories/invoices.repo'
import { ensureCustomerExists } from '@/lib/repositories/customers.repo'
import { ensureOrderBelongsToCustomer } from '@/lib/repositories/orders.repo'
import { newInvoiceSchema } from '@/lib/validators/invoice.schema'
import { requireAdmin } from '@/lib/auth/assertAdmin'
import { apiCreated, apiPage, handleApiError, parseWithSchema } from '@/lib/http/admin'
import { invoicesListQuerySchema } from '@/lib/validators/admin-api.schema'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  try {
    await requireAdmin(supabase)
    const filters = parseWithSchema(
      invoicesListQuerySchema,
      Object.fromEntries(request.nextUrl.searchParams)
    )
    const result = await findInvoices(supabase, filters)
    return apiPage(result)
  } catch (err) {
    return handleApiError(err)
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  try {
    const { user } = await requireAdmin(supabase, ['owner', 'admin', 'dispatcher'])
    const parsed = parseWithSchema(newInvoiceSchema, await request.json())
    await ensureCustomerExists(supabase, parsed.customer_id)
    if (parsed.order_id) {
      await ensureOrderBelongsToCustomer(supabase, parsed.order_id, parsed.customer_id)
    }
    const data = await createInvoice(supabase, parsed, user.id)
    return apiCreated(data)
  } catch (err) {
    return handleApiError(err)
  }
}
