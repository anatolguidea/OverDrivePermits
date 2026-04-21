import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, PermitStatus } from '@/lib/supabase/types'

export type PermitRow = Database['public']['Tables']['permits']['Row']
export type PermitUpdate = Database['public']['Tables']['permits']['Update']

export async function findPermitsByOrder(
  supabase: SupabaseClient<Database>,
  order_id: string
): Promise<PermitRow[]> {
  const { data, error } = await supabase
    .from('permits')
    .select('*')
    .eq('order_id', order_id)
    .order('state_code')

  if (error) throw new Error(`permits.findByOrder: ${error.message}`)
  return data ?? []
}

export async function updatePermit(
  supabase: SupabaseClient<Database>,
  id: string,
  values: PermitUpdate
): Promise<PermitRow> {
  // Auto-stamp submitted_at / issue_date on status transitions
  const patch: PermitUpdate = { ...values }
  if (values.status === 'submitted' && !patch.submitted_at) {
    patch.submitted_at = new Date().toISOString()
  }
  if (values.status === 'issued' && !patch.issue_date) {
    patch.issue_date = new Date().toISOString().split('T')[0]
  }

  const { data, error } = await supabase
    .from('permits')
    .update(patch)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(`permits.update: ${error.message}`)
  return data
}

export async function setPermitDocumentUrl(
  supabase: SupabaseClient<Database>,
  id: string,
  document_url: string
): Promise<PermitRow> {
  const { data, error } = await supabase
    .from('permits')
    .update({ document_url })
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(`permits.setDocumentUrl: ${error.message}`)
  return data
}

export async function getPermitDocumentSignedUrl(
  supabase: SupabaseClient<Database>,
  storagePath: string,
  expiresIn = 3600
): Promise<string> {
  const { data, error } = await supabase.storage
    .from('permit-documents')
    .createSignedUrl(storagePath, expiresIn)

  if (error) throw new Error(`permits.getSignedUrl: ${error.message}`)
  return data.signedUrl
}

export async function uploadPermitDocument(
  supabase: SupabaseClient<Database>,
  permitId: string,
  orderId: string,
  file: Buffer,
  fileName: string,
  mimeType: string
): Promise<string> {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? 'pdf'
  const storagePath = `${orderId}/${permitId}.${ext}`

  const { error } = await supabase.storage
    .from('permit-documents')
    .upload(storagePath, file, {
      contentType: mimeType,
      upsert: true,
    })

  if (error) throw new Error(`permits.upload: ${error.message}`)
  return storagePath
}

// Validate permit status transition
export function assertValidTransition(from: PermitStatus, to: PermitStatus): void {
  const allowed: Record<PermitStatus, PermitStatus[]> = {
    pending:   ['submitted'],
    submitted: ['issued', 'pending'],
    issued:    [],
  }
  if (!allowed[from]?.includes(to)) {
    throw new Error(`Invalid status transition: ${from} → ${to}`)
  }
}
