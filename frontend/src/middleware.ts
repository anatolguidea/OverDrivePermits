import { NextResponse, type NextRequest } from 'next/server'
import { createMiddlewareClient } from '@/lib/supabase/middleware-client'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request })
  const supabase = createMiddlewareClient(request, response)

  // Refresh session — keeps auth cookies up-to-date
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Public routes that don't require auth
  if (pathname === '/login' || pathname === '/') {
    // If logged-in admin visits /login, redirect to dashboard
    if (user && pathname === '/login') {
      const isAdmin = await checkIsAdmin(supabase, user.id)
      if (isAdmin) {
        return NextResponse.redirect(new URL('/admin/dashboard', request.url))
      }
    }
    return response
  }

  // All /admin/* and /api/admin/* routes require authentication
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    if (!user) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(loginUrl)
    }

    const isAdmin = await checkIsAdmin(supabase, user.id)
    if (!isAdmin) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return response
}

async function checkIsAdmin(
  supabase: ReturnType<typeof createMiddlewareClient>,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('admins')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle()

  return !error && data !== null
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/admin/:path*',
    '/login',
  ],
}
