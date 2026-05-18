import { z } from 'zod'

const trimmedOptionalString = z
  .string()
  .trim()
  .max(120)
  .optional()
  .transform((value) => value || undefined)

const positiveInt = (fallback: number, max: number) =>
  z.coerce.number().int().min(1).max(max).optional().transform((value) => value ?? fallback)

export const uuidParamSchema = z.string().uuid('Invalid identifier')

export const customerScopedQuerySchema = z.object({
  customer_id: z.string().uuid('customer_id required'),
})

export const orderScopedQuerySchema = z.object({
  order_id: z.string().uuid('order_id required'),
})

export const customersListQuerySchema = z.object({
  search: trimmedOptionalString,
  page: positiveInt(1, 10000),
  page_size: positiveInt(30, 200),
})

export const ordersListQuerySchema = z.object({
  status: z.enum(['draft', 'active', 'completed', 'cancelled', 'all']).optional().transform((value) => value ?? 'all'),
  customer_id: z.string().uuid().optional(),
  date_from: z.string().date().optional(),
  date_to: z.string().date().optional(),
  search: trimmedOptionalString,
  page: positiveInt(1, 10000),
  page_size: positiveInt(25, 200),
})

export const invoicesListQuerySchema = z.object({
  status: z.enum(['draft', 'sent', 'overdue', 'paid', 'void', 'all']).optional().transform((value) => value ?? 'all'),
  customer_id: z.string().uuid().optional(),
  search: trimmedOptionalString,
  page: positiveInt(1, 10000),
  page_size: positiveInt(25, 200),
})

export const revealCredentialQuerySchema = z.object({
  reason: trimmedOptionalString,
})
