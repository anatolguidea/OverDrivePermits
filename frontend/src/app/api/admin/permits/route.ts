import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { findPermitsByOrder } from '@/lib/repositories/permits.repo'
import { assertAdmin } from '@/lib/auth/assertAdmin'
import { getErrorMessage } from '@/lib/errors'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  if (!(await assertAdmin(supabase))) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const order_id = request.nextUrl.searchParams.get('order_id')
  if (!order_id) {
    return NextResponse.json({ success: false, error: 'order_id required' }, { status: 400 })
  }

  try {
    const data = await findPermitsByOrder(supabase, order_id)
    return NextResponse.json({ success: true, data })
  } catch (err) {
    return NextResponse.json({ success: false, error: getErrorMessage(err) }, { status: 500 })
  }
}
