import { afterEach, describe, expect, it, vi } from 'vitest'
import { createHmac } from 'crypto'
import { normalizeAdminRole } from './roles'

vi.mock('server-only', () => ({}))
import {
  ADMIN_2FA_COOKIE_NAME,
  buildTwoFactorCookieValue,
  buildTwoFactorChallenge,
  buildTwoFactorRedirect,
  isTwoFactorRequiredRole,
  verifyTwoFactorCookieValue,
} from './two-factor'

describe('two-factor helpers', () => {
  const secret = 'test-secret'
  const now = new Date('2026-04-24T12:00:00.000Z')
  const originalEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('marks owner-like admin roles as requiring 2FA only when enabled', () => {
    process.env.ADMIN_2FA_REQUIRED = 'true'
    expect(isTwoFactorRequiredRole('owner')).toBe(true)
    expect(isTwoFactorRequiredRole('admin')).toBe(true)
    expect(normalizeAdminRole('super_admin')).toBe('owner')
    expect(normalizeAdminRole('dispatcher')).toBe('dispatcher')
    expect(normalizeAdminRole('viewer')).toBe('viewer')

    process.env.ADMIN_2FA_REQUIRED = 'false'
    expect(isTwoFactorRequiredRole('owner')).toBe(false)
    expect(isTwoFactorRequiredRole('admin')).toBe(false)
  })

  it('signs and verifies the 2FA cookie payload', () => {
    const value = buildTwoFactorCookieValue({
      userId: 'user-1',
      role: 'owner',
      secret,
      now,
      maxAgeSeconds: 300,
    })

    expect(verifyTwoFactorCookieValue({
      userId: 'user-1',
      role: 'owner',
      value,
      secret,
      now,
    })).toBe(true)
    expect(verifyTwoFactorCookieValue({
      userId: 'user-1',
      role: 'admin',
      value,
      secret,
      now,
    })).toBe(false)
  })

  it('rejects tampered or expired 2FA cookies', () => {
    const issuedAt = Math.floor(now.getTime() / 1000)
    const expiresAt = issuedAt - 1
    const payload = `user-1.owner.${expiresAt}`
    const signature = createHmac('sha256', secret).update(payload).digest('base64url')
    const expired = `${payload}.${signature}`

    expect(verifyTwoFactorCookieValue({
      userId: 'user-1',
      role: 'owner',
      value: expired,
      secret,
      now,
    })).toBe(false)

    const valid = buildTwoFactorCookieValue({
      userId: 'user-1',
      role: 'owner',
      secret,
      now,
      maxAgeSeconds: 300,
    })

    const tampered = valid.replace('owner', 'admin')
    expect(verifyTwoFactorCookieValue({
      userId: 'user-1',
      role: 'owner',
      value: tampered,
      secret,
      now,
    })).toBe(false)
  })

  it('builds login challenge params for enroll and verify states', () => {
    expect(buildTwoFactorChallenge(true)).toEqual({
      requiresTwoFactor: true,
      enrolled: true,
    })
    expect(buildTwoFactorChallenge(false)).toEqual({
      requiresTwoFactor: true,
      enrolled: false,
    })
  })

  it('builds a login redirect with 2FA query params', () => {
    const url = buildTwoFactorRedirect('https://app.test/admin/orders')
    expect(url.pathname).toBe('/login')
    expect(url.searchParams.get('mfa')).toBe('required')
    expect(url.searchParams.get('redirectTo')).toBe('/admin/orders')
  })

  it('exports a stable cookie name for middleware and routes', () => {
    expect(ADMIN_2FA_COOKIE_NAME).toBe('admin_2fa')
  })
})
