import 'server-only'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import type { Database, AdminRole } from '@/lib/supabase/types'
import { forbidden, unauthorized } from '@/lib/errors'
import { isLockedOut } from '@/lib/auth/lockout'
import { cookies, headers } from 'next/headers'
import { normalizeAdminRole, type CanonicalAdminRole } from '@/lib/auth/roles'
import {
  ADMIN_2FA_COOKIE_NAME,
  isTwoFactorRequiredRole,
  verifyTwoFactorCookieValue,
} from '@/lib/auth/two-factor'

export type { AdminRole }

export interface AdminContext {
  user: User
  admin: Database['public']['Tables']['admins']['Row']
  role: CanonicalAdminRole
  twoFactorEnrolled: boolean
  twoFactorVerified: boolean
  ip: string
  userAgent: string
}

export interface RequireAdminOptions {
  allowedRoles?: readonly CanonicalAdminRole[]
  allowUnverifiedTwoFactor?: boolean
}

export async function getAdminContext(
  supabase: SupabaseClient<Database>
): Promise<AdminContext | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: admin } = await supabase
    .from('admins')
    .select('user_id, role, created_at')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!admin) return null

  const { data: profile } = await supabase
    .from('operator_profiles')
    .select('totp_secret_enc')
    .eq('user_id', user.id)
    .maybeSingle()

  const h = await headers()
  const cookieStore = await cookies()
  const role = normalizeAdminRole(admin.role as AdminRole)
  const ip =
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    h.get('x-real-ip') ??
    'unknown'
  const userAgent = h.get('user-agent') ?? 'unknown'

  const twoFactorEnrolled = Boolean(profile?.totp_secret_enc)
  const twoFactorVerified =
    !isTwoFactorRequiredRole(role) ||
    verifyTwoFactorCookieValue({
      userId: user.id,
      role,
      value: cookieStore.get(ADMIN_2FA_COOKIE_NAME)?.value,
    })

  return { user, admin, role, twoFactorEnrolled, twoFactorVerified, ip, userAgent }
}

export async function assertAdmin(
  supabase: SupabaseClient<Database>
): Promise<User | null> {
  const context = await getAdminContext(supabase)
  return context?.user ?? null
}

export async function requireAdmin(
  supabase: SupabaseClient<Database>,
  allowedRolesOrOptions?: readonly CanonicalAdminRole[] | RequireAdminOptions
): Promise<AdminContext> {
  const context = await getAdminContext(supabase)
  if (!context) throw unauthorized()

  let options: RequireAdminOptions = {}
  if (Array.isArray(allowedRolesOrOptions)) {
    options = { allowedRoles: allowedRolesOrOptions }
  } else if (allowedRolesOrOptions) {
    options = allowedRolesOrOptions as RequireAdminOptions
  }

  const locked = await isLockedOut(supabase, context.user.id)
  if (locked) throw forbidden('Account is temporarily locked. Please try again later.')

  if (options.allowedRoles && !options.allowedRoles.includes(context.role)) {
    throw forbidden('Insufficient privileges')
  }

  if (
    isTwoFactorRequiredRole(context.role) &&
    !options.allowUnverifiedTwoFactor
  ) {
    if (!context.twoFactorEnrolled) {
      throw forbidden('2FA enrollment is required for this role')
    }
    if (!context.twoFactorVerified) {
      throw forbidden('2FA verification required')
    }
  }

  return context
}
