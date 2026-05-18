import { NextResponse, type NextRequest } from 'next/server'
import { createMiddlewareClient } from '@/lib/supabase/middleware-client'
import { generateCsrfToken, getCsrfToken, setCsrfCookie, validateCsrf } from '@/lib/auth/csrf'
import { buildContentSecurityPolicy } from '@/lib/security/csp'
import {
  ADMIN_2FA_COOKIE_NAME,
  buildTwoFactorRedirect,
} from '@/lib/auth/two-factor.shared'
import { ensureCriticalEnvConfigured } from '@/lib/config/env'
import {
  isAdminDashboardRole,
  isTwoFactorRequiredRole,
} from '@/lib/auth/policy'
import { normalizeAdminRole } from '@/lib/auth/roles'
import { getSafeAdminRedirect } from '@/lib/auth/redirects'

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])
const LOGIN_ALLOWED_QUERY_PARAMS = new Set(['mfa', 'redirectTo'])
const SENSITIVE_QUERY_KEYS = new Set([
  'email',
  'password',
  'pass',
  'token',
  'code',
  'otp',
  'secret',
  'access_token',
  'refresh_token',
])

function applySecurityHeaders(response: NextResponse, isProd: boolean): void {
  const h = response.headers
  h.set('X-Content-Type-Options', 'nosniff')
  h.set('X-Frame-Options', 'DENY')
  h.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  h.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  h.set('Content-Security-Policy', buildContentSecurityPolicy({
    isDev: !isProd,
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  }))
  if (isProd) {
    h.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  }
}

export async function middleware(request: NextRequest) {
  ensureCriticalEnvConfigured()
  const response = NextResponse.next({ request })
  const supabase = createMiddlewareClient(request, response)

  applySecurityHeaders(response, process.env.NODE_ENV === 'production')

  // Ensure CSRF token cookie is always present
  if (!getCsrfToken(request)) {
    setCsrfCookie(response, generateCsrfToken())
  }

  const { pathname } = request.nextUrl
  const isApiRoute = pathname.startsWith('/api/')
  const isAdminRoute = pathname.startsWith('/admin')
  const isAdminApiRoute = pathname.startsWith('/api/admin')
  const isOwnerRecoveryRoute = pathname === '/api/admin/auth/2fa/reset-user'

  if (pathname === '/login' && request.nextUrl.searchParams.size > 0) {
    const hasSensitiveParam = Array.from(request.nextUrl.searchParams.keys()).some((key) =>
      SENSITIVE_QUERY_KEYS.has(key.toLowerCase())
    )
    const hasUnexpectedParam = Array.from(request.nextUrl.searchParams.keys()).some(
      (key) => !LOGIN_ALLOWED_QUERY_PARAMS.has(key)
    )

    if (hasSensitiveParam || hasUnexpectedParam) {
      const sanitizedUrl = new URL('/login', request.url)
      const mfa = request.nextUrl.searchParams.get('mfa')
      const redirectTo = request.nextUrl.searchParams.get('redirectTo')
      if (mfa === 'required') sanitizedUrl.searchParams.set('mfa', 'required')
      if (redirectTo) sanitizedUrl.searchParams.set('redirectTo', getSafeAdminRedirect(redirectTo))
      return NextResponse.redirect(sanitizedUrl)
    }
  }

  // Validate CSRF on all state-mutating API calls
  if (isApiRoute && MUTATION_METHODS.has(request.method)) {
    if (!validateCsrf(request)) {
      return NextResponse.json({ success: false, error: 'Invalid CSRF token' }, { status: 403 })
    }
  }

  // Refresh session — keeps auth cookies up-to-date
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (pathname === '/login' || pathname === '/') {
    if (user && pathname === '/login') {
      const adminRole = await findAdminRole(supabase, user.id)
      if (isAdminDashboardRole(adminRole)) {
        const { data: profile } = await supabase
          .from('operator_profiles')
          .select('totp_secret_enc')
          .eq('user_id', user.id)
          .maybeSingle()

        const requires2fa = isTwoFactorRole(adminRole)
        const hasEnrollment = Boolean(profile?.totp_secret_enc)
        const hasVerifiedSession = Boolean(request.cookies.get(ADMIN_2FA_COOKIE_NAME)?.value)
        const twoFactorSatisfied = !requires2fa || (hasEnrollment && hasVerifiedSession)

        // Avoid /login <-> /admin redirect loops while 2FA is pending
        if (twoFactorSatisfied) {
          return NextResponse.redirect(new URL('/admin/dashboard', request.url))
        }

        const isTwoFactorPrompt = request.nextUrl.searchParams.get('mfa') === 'required'
        if (!isTwoFactorPrompt) {
          return NextResponse.redirect(
            buildTwoFactorRedirect(new URL('/admin/dashboard', request.url).toString())
          )
        }
      }
    }
    return response
  }

  if (isAdminRoute || isAdminApiRoute) {
    if (!user) {
      if (isAdminApiRoute) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
      }
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(loginUrl)
    }
    const adminRole = await findAdminRole(supabase, user.id)
    const hasRouteAccess = isOwnerRecoveryRoute
      ? adminRole === 'owner'
      : isAdminDashboardRole(adminRole)

    if (!hasRouteAccess) {
      if (isAdminApiRoute) {
        return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
      }
      return NextResponse.redirect(new URL('/', request.url))
    }

    const { data: profile } = await supabase
      .from('operator_profiles')
      .select('totp_secret_enc')
      .eq('user_id', user.id)
      .maybeSingle()

    const twoFactorRequired = isTwoFactorRole(adminRole ?? 'viewer')
    const hasEnrollment = Boolean(profile?.totp_secret_enc)
    const hasVerifiedSession = Boolean(request.cookies.get(ADMIN_2FA_COOKIE_NAME)?.value)
    const twoFactorSatisfied = !twoFactorRequired || (hasEnrollment && hasVerifiedSession)

    if (!twoFactorSatisfied && !pathname.startsWith('/api/auth/2fa')) {
      if (isAdminApiRoute) {
        return NextResponse.json(
          {
            success: false,
            error: hasEnrollment ? '2FA verification required' : '2FA enrollment is required for this role',
          },
          { status: 403 }
        )
      }
      return NextResponse.redirect(buildTwoFactorRedirect(request.url))
    }

    if (pathname === '/admin') {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url))
    }
  }

  return response
}

async function findAdminRole(
  supabase: ReturnType<typeof createMiddlewareClient>,
  userId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('admins')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle()
  return error ? null : data?.role ?? null
}

function isTwoFactorRole(role: string): boolean {
  return isTwoFactorRequiredRole(role ? normalizeAdminRole(role as Parameters<typeof normalizeAdminRole>[0]) : 'viewer')
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/admin/:path*',
    '/api/auth/:path*',
    '/login',
  ],
}
