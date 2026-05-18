import 'server-only'
import { createHmac, timingSafeEqual } from 'crypto'
import type { CanonicalAdminRole } from '@/lib/auth/roles'
import {
  ADMIN_2FA_COOKIE_MAX_AGE_SECONDS,
  ADMIN_2FA_COOKIE_NAME,
  buildTwoFactorChallenge,
  buildTwoFactorRedirect,
  isTwoFactorRequiredRole,
} from './two-factor.shared'

const COOKIE_SECRET_ENV = 'ADMIN_2FA_COOKIE_SECRET'

interface CookieInput {
  userId: string
  role: CanonicalAdminRole
  secret?: string
  now?: Date
  maxAgeSeconds?: number
}

interface CookieVerifyInput {
  userId: string
  role: CanonicalAdminRole
  value?: string | null
  secret?: string
  now?: Date
}

function getCookieSecret(secret?: string): string {
  const resolved = secret ?? process.env[COOKIE_SECRET_ENV]
  if (!resolved) {
    throw new Error(`${COOKIE_SECRET_ENV} is not configured`)
  }
  return resolved
}

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url')
}

export function buildTwoFactorCookieValue(input: CookieInput): string {
  const now = input.now ?? new Date()
  const maxAgeSeconds = input.maxAgeSeconds ?? ADMIN_2FA_COOKIE_MAX_AGE_SECONDS
  const expiresAt = Math.floor(now.getTime() / 1000) + maxAgeSeconds
  const payload = `${input.userId}.${input.role}.${expiresAt}`
  const signature = sign(payload, getCookieSecret(input.secret))
  return `${payload}.${signature}`
}

export function verifyTwoFactorCookieValue(input: CookieVerifyInput): boolean {
  if (!input.value) return false

  const parts = input.value.split('.')
  if (parts.length < 4) return false

  const signature = parts.pop()
  if (!signature) return false

  const [userId, role, expiresAtRaw] = parts
  if (userId !== input.userId || role !== input.role) return false

  const expiresAt = Number.parseInt(expiresAtRaw, 10)
  if (!Number.isFinite(expiresAt)) return false
  if (expiresAt <= Math.floor((input.now ?? new Date()).getTime() / 1000)) return false

  const payload = `${userId}.${role}.${expiresAt}`
  const expected = sign(payload, getCookieSecret(input.secret))

  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
}

export {
  ADMIN_2FA_COOKIE_MAX_AGE_SECONDS,
  ADMIN_2FA_COOKIE_NAME,
  buildTwoFactorChallenge,
  buildTwoFactorRedirect,
  isTwoFactorRequiredRole,
}
