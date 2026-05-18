import { afterEach, describe, expect, it } from 'vitest'
import {
  isAdminDashboardRole,
  isTwoFactorEnabled,
  isTwoFactorRequiredRole,
} from './policy'

describe('auth policy', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('allows only admin role into the dashboard', () => {
    expect(isAdminDashboardRole('admin')).toBe(true)
    expect(isAdminDashboardRole('owner')).toBe(false)
    expect(isAdminDashboardRole('dispatcher')).toBe(false)
    expect(isAdminDashboardRole('viewer')).toBe(false)
    expect(isAdminDashboardRole(null)).toBe(false)
  })

  it('enables 2FA only with the explicit env flag', () => {
    delete process.env.ADMIN_2FA_REQUIRED
    expect(isTwoFactorEnabled()).toBe(false)

    process.env.ADMIN_2FA_REQUIRED = 'false'
    expect(isTwoFactorEnabled()).toBe(false)

    process.env.ADMIN_2FA_REQUIRED = 'true'
    expect(isTwoFactorEnabled()).toBe(true)
  })

  it('requires 2FA only for admin-like roles when enabled', () => {
    process.env.ADMIN_2FA_REQUIRED = 'true'
    expect(isTwoFactorRequiredRole('admin')).toBe(true)
    expect(isTwoFactorRequiredRole('owner')).toBe(true)
    expect(isTwoFactorRequiredRole('dispatcher')).toBe(false)
    expect(isTwoFactorRequiredRole('viewer')).toBe(false)

    process.env.ADMIN_2FA_REQUIRED = 'false'
    expect(isTwoFactorRequiredRole('admin')).toBe(false)
    expect(isTwoFactorRequiredRole('owner')).toBe(false)
  })
})

