import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { uploadPermitDocument, setPermitDocumentUrl } from '@/lib/repositories/permits.repo'

const ALLOWED_TYPES = ['application/pdf', 'image/png', 'image/jpeg']
const MAX_BYTES = 10 * 1024 * 1024 // 10 MB

async function assertAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data } = await supabase.from('admins').select('user_id').eq('user_id', user.id).maybeSingle()
  return data !== null
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  if (!(await assertAdmin(supabase))) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  // Fetch permit to get order_id
  const { data: permit, error: permitErr } = await supabase
    .from('permits').select('id, order_id').eq('id', params.id).single()
  if (permitErr || !permit) {
    return NextResponse.json({ success: false, error: 'Permit not found' }, { status: 404 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) {
    return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 })
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { success: false, error: 'Only PDF, PNG, and JPEG files are allowed' },
      { status: 415 }
    )
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { success: false, error: 'File exceeds 10 MB limit' },
      { status: 413 }
    )
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    const storagePath = await uploadPermitDocument(
      supabase,
      permit.id,
      permit.order_id,
      buffer,
      file.name,
      file.type
    )
    const updated = await setPermitDocumentUrl(supabase, permit.id, storagePath)
    return NextResponse.json({ success: true, data: updated })
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
