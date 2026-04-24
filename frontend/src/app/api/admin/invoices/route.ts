import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { findInvoices, createInvoice, type InvoiceFilters } from '@/lib/repositories/invoices.repo'
import { newInvoiceSchema } from '@/lib/validators/invoice.schema'
import { assertAdmin } from '@/lib/auth/assertAdmin'
import { getErrorMessage } from '@/lib/errors'
import type { InvoiceStatus } from '@/lib/supabase/types'

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  if (!(await assertAdmin(supabase))) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const sp = request.nextUrl.searchParams

  const filters: InvoiceFilters = {
    status: (sp.get('status') as InvoiceStatus | 'all') || 'all',
    customer_id: sp.get('customer_id') || undefined,
    search: sp.get('search') || undefined,
    page: sp.get('page') ? Number(sp.get('page')) : 1,
    page_size: sp.get('page_size') ? Number(sp.get('page_size')) : 25,
  }

  try {
    const result = await findInvoices(supabase, filters)
    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    return NextResponse.json({ success: false, error: getErrorMessage(err) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const user = await assertAdmin(supabase)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()

  const parsed = newInvoiceSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 422 })
  }

  try {
    const data = await createInvoice(supabase, parsed.data, user.id)
    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ success: false, error: getErrorMessage(err) }, { status: 500 })
  }
}
