import { describe, expect, it } from 'vitest'
import { normalizeAdminRole } from './roles'

describe('normalizeAdminRole', () => {
  it('maps legacy elevated roles to owner', () => {
    expect(normalizeAdminRole('owner')).toBe('owner')
    expect(normalizeAdminRole('super_admin')).toBe('owner')
  })

  it('preserves operational roles', () => {
    expect(normalizeAdminRole('admin')).toBe('admin')
    expect(normalizeAdminRole('dispatcher')).toBe('dispatcher')
    expect(normalizeAdminRole('viewer')).toBe('viewer')
  })
})
