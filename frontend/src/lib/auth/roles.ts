import type { AdminRole, CanonicalAdminRole } from '@/lib/supabase/types'

export type { CanonicalAdminRole }

export function normalizeAdminRole(role: AdminRole): CanonicalAdminRole {
  if (role === 'super_admin' || role === 'owner') return 'owner'
  if (role === 'admin') return 'admin'
  if (role === 'dispatcher') return 'dispatcher'
  return 'viewer'
}
