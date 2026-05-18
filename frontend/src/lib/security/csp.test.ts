import { describe, expect, it } from 'vitest'
import { buildContentSecurityPolicy } from './csp'

describe('buildContentSecurityPolicy', () => {
  it('omits unsafe-inline for production scripts', () => {
    const policy = buildContentSecurityPolicy({
      isDev: false,
      supabaseUrl: 'https://project.supabase.co',
    })

    expect(policy).toContain("default-src 'self'")
    expect(policy).toContain("script-src 'self'")
    expect(policy).not.toContain("script-src 'self' 'unsafe-inline'")
    expect(policy).toContain('https://project.supabase.co')
  })

  it('allows eval only in development', () => {
    const policy = buildContentSecurityPolicy({
      isDev: true,
      supabaseUrl: 'https://project.supabase.co',
    })

    expect(policy).toContain("'unsafe-eval'")
  })
})
