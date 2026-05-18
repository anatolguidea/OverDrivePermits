import { describe, expect, it } from 'vitest'
import { getSafeAdminRedirect } from './redirects'

describe('getSafeAdminRedirect', () => {
  it('defaults to dashboard when redirect is missing or unsafe', () => {
    expect(getSafeAdminRedirect(null)).toBe('/admin/dashboard')
    expect(getSafeAdminRedirect('/')).toBe('/admin/dashboard')
    expect(getSafeAdminRedirect('/login')).toBe('/admin/dashboard')
    expect(getSafeAdminRedirect('//evil.test/admin')).toBe('/admin/dashboard')
    expect(getSafeAdminRedirect('https://evil.test/admin')).toBe('/admin/dashboard')
  })

  it('allows internal admin redirects with query strings', () => {
    expect(getSafeAdminRedirect('/admin')).toBe('/admin')
    expect(getSafeAdminRedirect('/admin/orders?page=2')).toBe('/admin/orders?page=2')
    expect(getSafeAdminRedirect('/admin/dashboard')).toBe('/admin/dashboard')
  })
})

