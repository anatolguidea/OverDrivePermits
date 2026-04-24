import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPermitDocumentSignedUrl } from '@/lib/repositories/permits.repo'
import { assertAdmin } from '@/lib/auth/assertAdmin'
import { getErrorMessage } from '@/lib/errors'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  if (!(await assertAdmin(supabase))) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { data: permit } = await supabase
    .from('permits').select('document_url').eq('id', params.id).single()

  if (!permit?.document_url) {
    return NextResponse.json({ success: false, error: 'No document' }, { status: 404 })
  }

  try {
    const signedUrl = await getPermitDocumentSignedUrl(supabase, permit.document_url)
    return NextResponse.json({ success: true, signedUrl })
  } catch (err) {
    return NextResponse.json({ success: false, error: getErrorMessage(err) }, { status: 500 })
  }
}
