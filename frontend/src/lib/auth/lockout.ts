import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

export async function recordSuccessfulLogin(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<void> {
  await supabase
    .from('operator_profiles')
    .upsert(
      {
        user_id: userId,
        failed_login_count: 0,
        locked_until: null,
        last_login_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )
}

export async function recordFailedLogin(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<void> {
  await supabase.rpc('record_failed_login', {
    p_user_id: userId,
    p_max_attempts: 10,
    p_lockout_mins: 15,
  })
}

export async function isLockedOut(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('operator_profiles')
    .select('locked_until')
    .eq('user_id', userId)
    .maybeSingle()

  if (!data?.locked_until) return false
  return new Date(data.locked_until) > new Date()
}
