import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/assertAdmin'
import { apiSuccess, handleApiError } from '@/lib/http/admin'
import { badRequest } from '@/lib/errors'
import { z } from 'zod'

const reorderSchema = z.object({
  order: z.array(z.string().uuid()).min(1),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  try {
    await requireAdmin(supabase, ['owner', 'admin', 'dispatcher'])
    const body = await request.json()
    const { order: permitIds } = reorderSchema.parse(body)

    // Verify all permits belong to this order
    const { data: permits, error: fetchError } = await supabase
      .from('permits')
      .select('id')
      .eq('order_id', params.id)
      .in('id', permitIds)

    if (fetchError) throw fetchError
    if (!permits || permits.length !== permitIds.length) {
      throw badRequest('Some permit IDs do not belong to this order')
    }

    // Update sort_order for each permit
    await Promise.all(
      permitIds.map((id, index) =>
        supabase.from('permits').update({ sort_order: index }).eq('id', id)
      )
    )

    return apiSuccess({ reordered: permitIds.length })
  } catch (err) {
    return handleApiError(err)
  }
}
