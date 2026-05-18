import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/assertAdmin'
import { apiSuccess, handleApiError, parseWithSchema } from '@/lib/http/admin'
import {
  getInvoiceSettings,
  updateInvoiceSettings,
} from '@/lib/repositories/invoice-settings.repo'
import { invoiceSettingsSchema } from '@/lib/validators/invoice-settings.schema'

export async function GET() {
  const supabase = await createClient()
  try {
    await requireAdmin(supabase)
    const data = await getInvoiceSettings(supabase)
    return apiSuccess(data)
  } catch (err) {
    return handleApiError(err)
  }
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  try {
    const { user } = await requireAdmin(supabase, ['owner'])
    const parsed = parseWithSchema(invoiceSettingsSchema, await request.json())
    const data = await updateInvoiceSettings(supabase, parsed, user.id)
    return apiSuccess(data)
  } catch (err) {
    return handleApiError(err)
  }
}
