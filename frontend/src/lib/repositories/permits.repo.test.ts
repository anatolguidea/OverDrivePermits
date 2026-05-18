import { beforeAll, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

let assertValidTransition: typeof import('./permits.repo').assertValidTransition

beforeAll(async () => {
  ;({ assertValidTransition } = await import('./permits.repo'))
})

describe('assertValidTransition', () => {
  it('allows valid transitions', () => {
    expect(() => assertValidTransition('pending', 'submitted')).not.toThrow()
    expect(() => assertValidTransition('submitted', 'issued')).not.toThrow()
    expect(() => assertValidTransition('submitted', 'pending')).not.toThrow()
  })

  it('rejects invalid transitions', () => {
    expect(() => assertValidTransition('pending', 'issued')).toThrow(
      'Invalid status transition: pending → issued'
    )
    expect(() => assertValidTransition('issued', 'submitted')).toThrow(
      'Invalid status transition: issued → submitted'
    )
  })
})
