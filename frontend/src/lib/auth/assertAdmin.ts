import type { SupabaseClient, User } from '@supabase/supabase-js'

export async function assertAdmin(supabase: SupabaseClient): Promise<User | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('admins')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()
  return data ? user : null
}
