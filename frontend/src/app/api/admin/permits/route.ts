import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { findPermitsByOrder } from '@/lib/repositories/permits.repo'
import { requireAdmin } from '@/lib/auth/assertAdmin'
import { apiSuccess, handleApiError, parseWithSchema } from '@/lib/http/admin'
import { orderScopedQuerySchema } from '@/lib/validators/admin-api.schema'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  try {
    await requireAdmin(supabase)
    const { order_id } = parseWithSchema(
      orderScopedQuerySchema,
      Object.fromEntries(request.nextUrl.searchParams)
    )
    const data = await findPermitsByOrder(supabase, order_id)
    return apiSuccess(data)
  } catch (err) {
    return handleApiError(err)
  }
}
