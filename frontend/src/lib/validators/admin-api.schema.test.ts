import { describe, expect, it } from 'vitest'
import {
  customerScopedQuerySchema,
  customersListQuerySchema,
  invoicesListQuerySchema,
  ordersListQuerySchema,
} from './admin-api.schema'

describe('admin-api schemas', () => {
  it('parses customer list defaults', () => {
    const parsed = customersListQuerySchema.parse({})
    expect(parsed).toEqual({
      search: undefined,
      page: 1,
      page_size: 30,
    })
  })

  it('rejects invalid scoped UUID params', () => {
    expect(() => customerScopedQuerySchema.parse({ customer_id: 'bad-id' })).toThrow()
  })

  it('parses order filters with defaults', () => {
    const parsed = ordersListQuerySchema.parse({
      status: 'active',
      page: '2',
      page_size: '50',
    })

    expect(parsed.status).toBe('active')
    expect(parsed.page).toBe(2)
    expect(parsed.page_size).toBe(50)
  })

  it('rejects invalid invoice status filters', () => {
    expect(() => invoicesListQuerySchema.parse({ status: 'archived' })).toThrow()
  })
})
