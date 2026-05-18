import 'server-only'
import { createServiceClient } from '@/lib/supabase/server'

interface RateLimitOptions {
  limit: number
  windowSeconds: number
}

export async function checkRateLimit(key: string, opts: RateLimitOptions): Promise<boolean> {
  try {
    const supabase = await createServiceClient()
    const { data, error } = await supabase.rpc('check_rate_limit', {
      p_key: key,
      p_limit: opts.limit,
      p_window_secs: opts.windowSeconds,
    })
    if (error) return true // fail open — don't block legitimate traffic on DB error
    return data as boolean
  } catch {
    return true // fail open
  }
}
