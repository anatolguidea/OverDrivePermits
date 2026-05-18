import { describe, expect, it } from 'vitest'
import { assertApiSuccess, getApiErrorMessage, parseApiResponse } from './client'

describe('client api helpers', () => {
  it('extracts string errors from API envelopes', () => {
    expect(getApiErrorMessage({ success: false, error: 'Not allowed' })).toBe('Not allowed')
  })

  it('extracts the first zod field error when present', () => {
    expect(
      getApiErrorMessage({
        success: false,
        error: null,
        details: { fieldErrors: { email: ['Email is invalid'] } },
      })
    ).toBe('Email is invalid')
  })

  it('parses successful response data', async () => {
    const response = Response.json({ success: true, data: { id: '123' } })

    await expect(parseApiResponse<{ id: string }>(response)).resolves.toEqual({ id: '123' })
  })

  it('throws sanitized messages for failed responses', async () => {
    const response = Response.json({ success: false, error: 'Validation failed' }, { status: 422 })

    await expect(parseApiResponse(response)).rejects.toThrow('Validation failed')
  })

  it('accepts no-content success responses', async () => {
    const response = new Response(null, { status: 204 })

    await expect(assertApiSuccess(response)).resolves.toBeUndefined()
  })
})
