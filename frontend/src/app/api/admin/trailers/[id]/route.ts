import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { findTrailerById, updateTrailer, deleteTrailer } from '@/lib/repositories/trailers.repo'
import { logAdminAction } from '@/lib/repositories/admin-audit.repo'
import { trailerSchema, normalizeTrailer } from '@/lib/validators/trailer.schema'
import { requireAdmin } from '@/lib/auth/assertAdmin'
import { apiNoContent, apiSuccess, handleApiError, parseWithSchema } from '@/lib/http/admin'
import { notFound } from '@/lib/errors'
import { uuidParamSchema } from '@/lib/validators/admin-api.schema'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  try {
    await requireAdmin(supabase, ['owner', 'admin', 'dispatcher'])
    const { id } = await params
    parseWithSchema(uuidParamSchema, id)
    const data = await findTrailerById(supabase, id)
    if (!data) throw notFound('Trailer not found')
    return apiSuccess(data)
  } catch (err) {
    return handleApiError(err)
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  try {
    await requireAdmin(supabase, ['owner', 'admin', 'dispatcher'])
    const { id } = await params
    parseWithSchema(uuidParamSchema, id)
    const trailer = await findTrailerById(supabase, id)
    if (!trailer) throw notFound('Trailer not found')
    const parsed = parseWithSchema(trailerSchema.partial(), await request.json())
    const data = await updateTrailer(supabase, id, normalizeTrailer(parsed as Parameters<typeof normalizeTrailer>[0]) as Parameters<typeof updateTrailer>[2])
    return apiSuccess(data)
  } catch (err) {
    return handleApiError(err)
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  try {
    const { user, role } = await requireAdmin(supabase, ['owner', 'admin'])
    const { id } = await params
    parseWithSchema(uuidParamSchema, id)
    const trailer = await findTrailerById(supabase, id)
    if (!trailer) throw notFound('Trailer not found')
    await deleteTrailer(supabase, id)
    await logAdminAction(supabase, {
      actor_user_id: user.id,
      actor_role:    role,
      action:        'trailer.delete',
      target_table:  'trailers',
      target_id:     id,
      metadata:      { customer_id: trailer.customer_id, unit_number: trailer.unit_number },
    })
    return apiNoContent()
  } catch (err) {
    return handleApiError(err)
  }
}
