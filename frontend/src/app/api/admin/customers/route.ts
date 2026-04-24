import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { findCustomers, createCustomer, type CustomerInsert } from '@/lib/repositories/customers.repo'
import { customerSchema, normalizeCustomer } from '@/lib/validators/customer.schema'
import { assertAdmin } from '@/lib/auth/assertAdmin'
import { getErrorMessage } from '@/lib/errors'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  if (!(await assertAdmin(supabase))) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const sp = request.nextUrl.searchParams
  try {
    const result = await findCustomers(supabase, {
      search:    sp.get('search') || undefined,
      page:      sp.get('page') ? Number(sp.get('page')) : 1,
      page_size: sp.get('page_size') ? Number(sp.get('page_size')) : 30,
    })
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
  const parsed = customerSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 422 })
  }

  try {
    const data = await createCustomer(supabase, {
      ...normalizeCustomer(parsed.data),
      created_by: user.id,
    } as CustomerInsert)
    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ success: false, error: getErrorMessage(err) }, { status: 500 })
  }
}
