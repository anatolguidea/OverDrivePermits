import { describe, expect, it } from 'vitest'
import { redactValue, toLogEntry } from './logger'

describe('logger redaction', () => {
  it('redacts sensitive nested fields', () => {
    expect(redactValue({
      password: 'secret',
      token: 'abcd',
      nested: {
        authorization: 'Bearer 123',
        refreshToken: 'refresh-token',
      },
      safe: 'ok',
    })).toEqual({
      password: '[REDACTED]',
      token: '[REDACTED]',
      nested: {
        authorization: '[REDACTED]',
        refreshToken: '[REDACTED]',
      },
      safe: 'ok',
    })
  })

  it('builds structured log entries with redacted metadata', () => {
    const entry = toLogEntry('error', 'request failed', {
      route: '/api/auth/login',
      password: 'secret',
    }, new Date('2026-04-24T12:00:00.000Z'))

    expect(entry).toEqual({
      level: 'error',
      message: 'request failed',
      route: '/api/auth/login',
      password: '[REDACTED]',
      timestamp: '2026-04-24T12:00:00.000Z',
    })
  })
})
