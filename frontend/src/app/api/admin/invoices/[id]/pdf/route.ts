import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/assertAdmin'
import { ensureInvoiceExists } from '@/lib/repositories/invoices.repo'
import { ensureCustomerExists } from '@/lib/repositories/customers.repo'
import { getInvoiceSettings } from '@/lib/repositories/invoice-settings.repo'
import { renderInvoicePdf } from '@/lib/invoices/pdf'
import { handleApiError, parseWithSchema } from '@/lib/http/admin'
import { uuidParamSchema } from '@/lib/validators/admin-api.schema'

export const runtime = 'nodejs'

type RouteContext = { params: { id: string } }

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const supabase = await createClient()
  try {
    await requireAdmin(supabase)
    const id = parseWithSchema(uuidParamSchema, params.id)
    const invoice = await ensureInvoiceExists(supabase, id)
    const customer = await ensureCustomerExists(supabase, invoice.customer_id)
    const settings = await getInvoiceSettings(supabase)
    const pdf = await renderInvoicePdf({ invoice, customer, settings })

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${invoice.invoice_number}.pdf"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    return handleApiError(err)
  }
}
