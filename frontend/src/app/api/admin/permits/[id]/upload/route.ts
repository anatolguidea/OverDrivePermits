import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { uploadPermitDocument, setPermitDocumentUrl } from '@/lib/repositories/permits.repo'
import { logAdminAction } from '@/lib/repositories/admin-audit.repo'
import { requireAdmin } from '@/lib/auth/assertAdmin'
import { handleApiError, parseWithSchema } from '@/lib/http/admin'
import { badRequest, notFound } from '@/lib/errors'
import { uuidParamSchema } from '@/lib/validators/admin-api.schema'

const ALLOWED_TYPES = ['application/pdf', 'image/png', 'image/jpeg']
const MAX_BYTES = 10 * 1024 * 1024
const EXTENSIONS_BY_TYPE: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/png': 'png',
  'image/jpeg': 'jpg',
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  try {
    const { user, role } = await requireAdmin(supabase, ['owner', 'admin', 'dispatcher'])
    const id = parseWithSchema(uuidParamSchema, params.id)
    const { data: permit, error: permitErr } = await supabase
      .from('permits').select('id, order_id, state_code').eq('id', id).maybeSingle()
    if (permitErr) throw new Error(permitErr.message)
    if (!permit) throw notFound('Permit not found')

    const formData = await request.formData()
    const file = formData.get('file')
    if (!(file instanceof File)) {
      throw badRequest('No file provided')
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

    const safeName = `document.${EXTENSIONS_BY_TYPE[file.type]}`
    const buffer = Buffer.from(await file.arrayBuffer())
    const storagePath = await uploadPermitDocument(
      supabase,
      permit.id,
      permit.order_id,
      buffer,
      safeName,
      file.type
    )
    const updated = await setPermitDocumentUrl(supabase, permit.id, storagePath)
    await logAdminAction(supabase, {
      actor_user_id: user.id,
      actor_role: role,
      action: 'permit.document.upload',
      target_table: 'permits',
      target_id: id,
      metadata: {
        order_id: permit.order_id,
        state_code: permit.state_code,
        mime_type: file.type,
        bytes: file.size,
        storage_path: storagePath,
      },
    })
    return NextResponse.json({ success: true, data: updated })
  } catch (err) {
    return handleApiError(err)
  }
}
