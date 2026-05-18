import { afterEach, describe, expect, it, vi } from 'vitest'
import { ensureCriticalEnvConfigured } from './env'

const CRITICAL_KEYS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
] as const

describe('ensureCriticalEnvConfigured', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnv }
    vi.unstubAllEnvs()
  })

  it('does not throw in development when keys are missing', () => {
    process.env.NODE_ENV = 'development'
    for (const key of CRITICAL_KEYS) {
      delete process.env[key]
    }

    expect(() => ensureCriticalEnvConfigured()).not.toThrow()
  })

  it('throws outside development when keys are missing', () => {
    process.env.NODE_ENV = 'test'
    for (const key of CRITICAL_KEYS) {
      delete process.env[key]
    }

    expect(() => ensureCriticalEnvConfigured()).toThrowError(/Missing required environment variables/)
  })

  it('requires 2FA cookie secret only when 2FA is enabled', () => {
    process.env.NODE_ENV = 'production'
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service'
    delete process.env.ADMIN_2FA_COOKIE_SECRET

    process.env.ADMIN_2FA_REQUIRED = 'false'
    expect(() => ensureCriticalEnvConfigured()).not.toThrow()

    process.env.ADMIN_2FA_REQUIRED = 'true'
    expect(() => ensureCriticalEnvConfigured()).toThrowError(/ADMIN_2FA_COOKIE_SECRET/)
  })

  it('does not throw when all keys are present', () => {
    process.env.NODE_ENV = 'production'
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service'
    process.env.ADMIN_2FA_COOKIE_SECRET = 'secret'

    expect(() => ensureCriticalEnvConfigured()).not.toThrow()
  })
})
