import type { CanonicalAdminRole } from '@/lib/auth/roles'

const TWO_FACTOR_REQUIRED_ROLES: readonly CanonicalAdminRole[] = ['admin', 'owner']

export function isAdminDashboardRole(role: string | null | undefined): role is 'admin' {
  return role === 'admin'
}

export function isTwoFactorEnabled(): boolean {
  return process.env.ADMIN_2FA_REQUIRED === 'true'
}

export function isTwoFactorRequiredRole(role: CanonicalAdminRole): boolean {
  return isTwoFactorEnabled() && TWO_FACTOR_REQUIRED_ROLES.includes(role)
}
