import { z } from 'zod'

export const lineItemSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  quantity: z.number({ error: 'Quantity must be a number' }).gt(0, 'Quantity must be greater than 0').default(1),
  unit_price: z.number({ error: 'Unit price must be a number' }).min(0, 'Unit price must be 0 or greater'),
  position: z.number().default(0),
})

export type LineItemValues = z.infer<typeof lineItemSchema>

export const newInvoiceSchema = z.object({
  customer_id: z.string().uuid('Select a customer'),
  order_id: z.string().uuid().optional().nullable(),
  tax: z.number({ error: 'Tax must be a number' }).min(0, 'Tax must be 0 or greater').default(0),
  status: z.enum(['draft', 'sent', 'paid']).default('draft'),
  issue_date: z.string().default(() => new Date().toISOString().split('T')[0]),
  due_date: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
  line_items: z.array(lineItemSchema).min(1, 'Add at least one line item'),
})

export type NewInvoiceValues = z.infer<typeof newInvoiceSchema>

export const updateInvoiceSchema = z.object({
  status: z.enum(['draft', 'sent', 'paid']).optional(),
  tax: z.number().min(0).optional(),
  due_date: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  paid_at: z.string().optional().nullable(),
})

export type UpdateInvoiceValues = z.infer<typeof updateInvoiceSchema>
