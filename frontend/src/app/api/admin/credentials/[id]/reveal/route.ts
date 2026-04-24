import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decryptCredential } from '@/lib/repositories/credentials.repo'
import { assertAdmin } from '@/lib/auth/assertAdmin'
import { getErrorMessage } from '@/lib/errors'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  if (!(await assertAdmin(supabase))) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const password = await decryptCredential(supabase, params.id)
    return NextResponse.json({ success: true, password })
  } catch (err) {
    return NextResponse.json({ success: false, error: getErrorMessage(err) }, { status: 500 })
  }
}
