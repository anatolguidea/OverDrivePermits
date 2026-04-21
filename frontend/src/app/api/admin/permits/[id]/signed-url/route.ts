import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPermitDocumentSignedUrl } from '@/lib/repositories/permits.repo'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  const { data: adminRow } = await supabase.from('admins').select('user_id').eq('user_id', user.id).maybeSingle()
  if (!adminRow) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const { data: permit } = await supabase
    .from('permits').select('document_url').eq('id', params.id).single()

  if (!permit?.document_url) {
    return NextResponse.json({ success: false, error: 'No document' }, { status: 404 })
  }

  try {
    const signedUrl = await getPermitDocumentSignedUrl(supabase, permit.document_url)
    return NextResponse.json({ success: true, signedUrl })
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
