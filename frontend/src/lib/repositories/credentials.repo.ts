import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import { encryptPassword, decryptPassword } from '@/lib/crypto/credentials'

export type CredentialRow = Database['public']['Tables']['customer_credentials']['Row']
type CredentialUpdatePayload = Database['public']['Tables']['customer_credentials']['Update']

export interface CredentialDisplay {
  id: string
  customer_id: string
  state_code: string
  username: string
  notes: string | null
  created_at: string
  updated_at: string
  // password is never returned — fetched only via decryptCredential()
}

export async function findCredentialsByCustomer(
  supabase: SupabaseClient<Database>,
  customer_id: string
): Promise<CredentialDisplay[]> {
  const { data, error } = await supabase
    .from('customer_credentials')
    .select('id, customer_id, state_code, username, notes, created_at, updated_at')
    .eq('customer_id', customer_id)
    .order('state_code')

  if (error) throw new Error(`credentials.findByCustomer: ${error.message}`)
  return data ?? []
}

export async function decryptCredential(
  supabase: SupabaseClient<Database>,
  id: string
): Promise<string> {
  const { data, error } = await supabase
    .from('customer_credentials')
    .select('password_ciphertext, password_iv, password_tag')
    .eq('id', id)
    .single()

  if (error) throw new Error(`credentials.decrypt: ${error.message}`)
  return decryptPassword({
    ciphertext: data.password_ciphertext,
    iv: data.password_iv,
    tag: data.password_tag,
  })
}

export async function createCredential(
  supabase: SupabaseClient<Database>,
  values: { customer_id: string; state_code: string; username: string; password: string; notes?: string | null }
): Promise<CredentialDisplay> {
  const encrypted = encryptPassword(values.password)

  const { data, error } = await supabase
    .from('customer_credentials')
    .insert({
      customer_id:         values.customer_id,
      state_code:          values.state_code,
      username:            values.username,
      password_ciphertext: encrypted.ciphertext,
      password_iv:         encrypted.iv,
      password_tag:        encrypted.tag,
      notes:               values.notes ?? null,
    })
    .select('id, customer_id, state_code, username, notes, created_at, updated_at')
    .single()

  if (error) throw new Error(`credentials.create: ${error.message}`)
  return data
}

export async function updateCredential(
  supabase: SupabaseClient<Database>,
  id: string,
  values: { username?: string; password?: string; notes?: string | null }
): Promise<CredentialDisplay> {
  const patch: Record<string, unknown> = {}
  if (values.username !== undefined) patch.username = values.username
  if (values.password !== undefined) {
    const encrypted = encryptPassword(values.password)
    patch.password_ciphertext = encrypted.ciphertext
    patch.password_iv         = encrypted.iv
    patch.password_tag        = encrypted.tag
  }
  if (values.notes !== undefined) patch.notes = values.notes

  const { data, error } = await supabase
    .from('customer_credentials')
    .update(patch as CredentialUpdatePayload)
    .eq('id', id)
    .select('id, customer_id, state_code, username, notes, created_at, updated_at')
    .single()

  if (error) throw new Error(`credentials.update: ${error.message}`)
  return data
}

export async function deleteCredential(
  supabase: SupabaseClient<Database>,
  id: string
): Promise<void> {
  const { error } = await supabase.from('customer_credentials').delete().eq('id', id)
  if (error) throw new Error(`credentials.delete: ${error.message}`)
}
