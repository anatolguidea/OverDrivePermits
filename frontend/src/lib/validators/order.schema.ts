import { z } from 'zod'

export const permitRowSchema = z.object({
  state_code: z.string().length(2),
  cost: z.number({ error: 'Cost must be a number' }).min(0).optional(),
})

export const newOrderSchema = z.object({
  customer_id: z.string().uuid('Select a customer'),
  vehicle_id:  z.string().uuid().optional().or(z.literal('')),
  origin:      z.string().optional().or(z.literal('')),
  destination: z.string().optional().or(z.literal('')),
  trip_date:   z.string().optional().or(z.literal('')),
  notes:       z.string().optional().or(z.literal('')),
  status:      z.enum(['draft', 'active']).default('active'),
  permits:     z.array(permitRowSchema).min(1, 'Add at least one state'),
})

export type NewOrderFormValues = z.infer<typeof newOrderSchema>

export const updateOrderSchema = z.object({
  status:      z.enum(['draft', 'active', 'completed', 'cancelled']).optional(),
  vehicle_id:  z.string().uuid().optional().nullable(),
  origin:      z.string().optional().or(z.literal('')),
  destination: z.string().optional().or(z.literal('')),
  trip_date:   z.string().optional().or(z.literal('')),
  notes:       z.string().optional().or(z.literal('')),
})

export type UpdateOrderValues = z.infer<typeof updateOrderSchema>
