import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

export type AdminAuditAction =
  | 'credential.create'
  | 'credential.update'
  | 'credential.delete'
  | 'credential.reveal'
  | 'customer.delete'
  | 'invoice.send'
  | 'invoice.void'
  | 'invoice.delete'
  | 'permit.document.upload'
  | 'permit.status.change'
  | 'truck.delete'
  | 'trailer.delete'
  | 'order.delete'
  | 'auth.2fa.reset'

interface AuditInput {
  actor_user_id: string
  actor_role: string
  action: AdminAuditAction
  target_table: string
  target_id?: string | null
  metadata?: Database['public']['Tables']['admin_audit_logs']['Insert']['metadata']
  ip?: string | null
  user_agent?: string | null
}

export async function logAdminAction(
  supabase: SupabaseClient<Database>,
  input: AuditInput
): Promise<void> {
  const { error } = await supabase
    .from('admin_audit_logs')
    .insert({
      actor_user_id: input.actor_user_id,
      actor_role:    input.actor_role,
      action:        input.action,
      target_table:  input.target_table,
      target_id:     input.target_id ?? null,
      metadata:      input.metadata ?? {},
      ip:            input.ip ?? null,
      user_agent:    input.user_agent ?? null,
    })

  if (error) throw new Error(`adminAudit.log: ${error.message}`)
}
