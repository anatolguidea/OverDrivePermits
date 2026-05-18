import type { AdminRole } from '@/lib/supabase/types'
import { forbidden } from '@/lib/errors'
import { normalizeAdminRole } from './roles'

export type Permission =
  | 'customers:read'   | 'customers:write'   | 'customers:delete'
  | 'orders:read'      | 'orders:write'      | 'orders:delete'
  | 'permits:read'     | 'permits:write'
  | 'vehicles:read'    | 'vehicles:write'    | 'vehicles:delete'
  | 'credentials:read' | 'credentials:write' | 'credentials:delete' | 'credentials:reveal'
  | 'invoices:read'    | 'invoices:write'    | 'invoices:delete'
  | 'audit:read'
  | 'settings:write'

const OWNER: readonly Permission[] = [
  'customers:read',
  'customers:write',
  'customers:delete',
  'orders:read',
  'orders:write',
  'orders:delete',
  'permits:read',
  'permits:write',
  'vehicles:read',
  'vehicles:write',
  'vehicles:delete',
  'credentials:read',
  'credentials:write',
  'credentials:delete',
  'credentials:reveal',
  'invoices:read',
  'invoices:write',
  'invoices:delete',
  'audit:read',
  'settings:write',
]

const ADMIN: readonly Permission[] = [
  'customers:read',
  'customers:write',
  'orders:read',
  'orders:write',
  'permits:read',
  'permits:write',
  'vehicles:read',
  'vehicles:write',
  'credentials:read',
  'credentials:write',
  'invoices:read',
  'invoices:write',
  'audit:read',
]

const DISPATCHER: readonly Permission[] = [
  'customers:read',
  'orders:read',
  'orders:write',
  'permits:read',
  'permits:write',
  'vehicles:read',
  'credentials:read',
  'invoices:read',
]

const VIEWER: readonly Permission[] = [
  'customers:read',
  'orders:read',
  'permits:read',
  'vehicles:read',
  'credentials:read',
  'invoices:read',
]

const ROLE_PERMISSIONS: Record<'owner' | 'admin' | 'dispatcher' | 'viewer', readonly Permission[]> = {
  owner: OWNER,
  admin: ADMIN,
  dispatcher: DISPATCHER,
  viewer: VIEWER,
}

export function hasPermission(role: AdminRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[normalizeAdminRole(role)]?.includes(permission) ?? false
}

export function assertPermission(role: AdminRole, permission: Permission): void {
  if (!hasPermission(role, permission)) {
    throw forbidden(`Role '${role}' cannot perform '${permission}'`)
  }
}
