import type { NextRequest, NextResponse } from 'next/server'

const CSRF_COOKIE = '__csrf'
const CSRF_HEADER = 'x-csrf-token'

export function getCsrfToken(request: NextRequest): string | undefined {
  return request.cookies.get(CSRF_COOKIE)?.value
}

export function generateCsrfToken(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return [...array].map(b => b.toString(16).padStart(2, '0')).join('')
}

export function validateCsrf(request: NextRequest): boolean {
  const cookie = request.cookies.get(CSRF_COOKIE)?.value
  const header = request.headers.get(CSRF_HEADER)
  return !!cookie && !!header && cookie === header
}

export function setCsrfCookie(response: NextResponse, token: string): void {
  response.cookies.set(CSRF_COOKIE, token, {
    httpOnly: false, // must be JS-readable so the client can copy it into the header
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24,
  })
}
