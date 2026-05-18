import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPermitDocumentSignedUrl } from '@/lib/repositories/permits.repo'
import { requireAdmin } from '@/lib/auth/assertAdmin'
import { apiSuccess, handleApiError, parseWithSchema } from '@/lib/http/admin'
import { notFound } from '@/lib/errors'
import { uuidParamSchema } from '@/lib/validators/admin-api.schema'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  try {
    await requireAdmin(supabase)
    const id = parseWithSchema(uuidParamSchema, params.id)
    const { data: permit } = await supabase
      .from('permits').select('document_url').eq('id', id).maybeSingle()

    if (!permit?.document_url) {
      throw notFound('No document')
    }

    const signedUrl = await getPermitDocumentSignedUrl(supabase, permit.document_url)
    return apiSuccess({ signedUrl })
  } catch (err) {
    return handleApiError(err)
  }
}
