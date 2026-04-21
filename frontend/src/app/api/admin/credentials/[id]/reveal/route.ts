import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decryptCredential } from '@/lib/repositories/credentials.repo'

// Dedicated endpoint so the plaintext password is never part of any list query.
// Returns it once — caller must not cache.
export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }
  const { data: adminRow } = await supabase
    .from('admins').select('user_id').eq('user_id', user.id).maybeSingle()
  if (!adminRow) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const password = await decryptCredential(supabase, params.id)
    return NextResponse.json({ success: true, password })
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
