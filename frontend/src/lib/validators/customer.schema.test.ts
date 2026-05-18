import { describe, expect, it } from 'vitest'
import { customerSchema, normalizeCustomer } from './customer.schema'

describe('customer schema', () => {
  it('accepts a minimal valid customer payload', () => {
    const parsed = customerSchema.parse({ name: 'Acme Logistics' })
    expect(parsed.name).toBe('Acme Logistics')
  })

  it('rejects malformed FEIN values', () => {
    expect(() => customerSchema.parse({ name: 'Acme', fein: '123456789' })).toThrow()
  })

  it('normalizes empty strings to null', () => {
    expect(
      normalizeCustomer({
        name: 'Acme Logistics',
        usdot: '',
        mc_number: '',
        fein: '',
        ifta_number: '',
        email: '',
        phone: '',
        address_line1: '',
        address_line2: '',
        city: '',
        state_code: '',
        zip: '',
      })
    ).toMatchObject({
      usdot: null,
      state_code: null,
      zip: null,
    })
  })
})
