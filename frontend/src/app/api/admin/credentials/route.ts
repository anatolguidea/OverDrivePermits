import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { findCredentialsByCustomer, createCredential } from '@/lib/repositories/credentials.repo'
import { credentialSchema } from '@/lib/validators/credential.schema'
import { assertAdmin } from '@/lib/auth/assertAdmin'
import { getErrorMessage } from '@/lib/errors'

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
    const data = await findCredentialsByCustomer(supabase, customer_id)
    return NextResponse.json({ success: true, data })
  } catch (err) {
    return NextResponse.json({ success: false, error: getErrorMessage(err) }, { status: 500 })
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

  const parsed = credentialSchema.safeParse(rest)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 422 })
  }

  try {
    const data = await createCredential(supabase, { customer_id, ...parsed.data })
    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ success: false, error: getErrorMessage(err) }, { status: 500 })
  }
}
