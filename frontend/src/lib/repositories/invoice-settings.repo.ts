import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import type { InvoiceSettingsValues } from '@/lib/validators/invoice-settings.schema'
import { normalizeInvoiceSettings } from '@/lib/validators/invoice-settings.schema'

export type InvoiceSettingsRow = Database['public']['Tables']['invoice_settings']['Row']

const INVOICE_SETTINGS_SELECT = `
  id, company_name, company_address, company_logo_url, sender_name, sender_email,
  invoice_number_prefix, next_invoice_number, updated_by, updated_at
`

export async function getInvoiceSettings(
  supabase: SupabaseClient<Database>
): Promise<InvoiceSettingsRow> {
  const { data: existing, error: readError } = await supabase
    .from('invoice_settings')
    .select(INVOICE_SETTINGS_SELECT)
    .eq('id', true)
    .maybeSingle()

  if (readError) throw new Error(`invoiceSettings.get: ${readError.message}`)

  if (existing) return existing

  const { data, error } = await supabase
    .from('invoice_settings')
    .upsert({ id: true }, { onConflict: 'id' })
    .select(INVOICE_SETTINGS_SELECT)
    .single()

  if (error) throw new Error(`invoiceSettings.bootstrap: ${error.message}`)
  return data
}

export async function updateInvoiceSettings(
  supabase: SupabaseClient<Database>,
  values: InvoiceSettingsValues,
  userId: string
): Promise<InvoiceSettingsRow> {
  const patch = normalizeInvoiceSettings(values)

  const { data, error } = await supabase
    .from('invoice_settings')
    .upsert(
      {
        id: true,
        ...patch,
        updated_by: userId,
      },
      { onConflict: 'id' }
    )
    .select(INVOICE_SETTINGS_SELECT)
    .single()

  if (error) throw new Error(`invoiceSettings.update: ${error.message}`)
  return data
}
