import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { findPermitsByOrder } from '@/lib/repositories/permits.repo'

async function assertAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data } = await supabase.from('admins').select('user_id').eq('user_id', user.id).maybeSingle()
  return data !== null
}

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
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
