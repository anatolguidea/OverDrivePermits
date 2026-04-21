import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { findVehiclesByCustomer, createVehicle } from '@/lib/repositories/vehicles.repo'
import { vehicleSchema, normalizeVehicle } from '@/lib/validators/vehicle.schema'

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

  const customer_id = request.nextUrl.searchParams.get('customer_id')
  if (!customer_id) {
    return NextResponse.json({ success: false, error: 'customer_id required' }, { status: 400 })
  }

  try {
    const data = await findVehiclesByCustomer(supabase, customer_id)
    return NextResponse.json({ success: true, data })
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  if (!(await assertAdmin(supabase))) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { customer_id, ...rest } = body
  if (!customer_id) {
    return NextResponse.json({ success: false, error: 'customer_id required' }, { status: 400 })
  }

  const parsed = vehicleSchema.safeParse(rest)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 422 })
  }

  try {
    const normalized = normalizeVehicle(parsed.data)
    const data = await createVehicle(supabase, { ...normalized, customer_id } as Parameters<typeof createVehicle>[1])
    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
