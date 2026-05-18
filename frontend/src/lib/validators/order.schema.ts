import { z } from 'zod'

const FEET_INCHES_REGEX = /^\d+('(\d{1,2}")?)?$|^\d+(\.\d+)?$/

export const dimensionsSchema = z.object({
  length:         z.number().min(0),
  width:          z.number().min(0),
  height:         z.number().min(0),
  weight:         z.number().min(0),
  overhang_front: z.number().min(0).default(0),
  overhang_rear:  z.number().min(0).default(0),
  overhang_left:  z.number().min(0).default(0),
  overhang_right: z.number().min(0).default(0),
}).optional()

export const permitRowSchema = z.object({
  jurisdiction: z.string().min(1, 'Jurisdiction is required'),
  cost:         z.number({ error: 'Cost must be a number' }).min(0).optional(),
  sort_order:   z.number().int().min(0).optional(),
})

export const newOrderSchema = z.object({
  customer_id:      z.string().uuid('Select a customer'),
  truck_id:         z.string().uuid().optional().or(z.literal('')),
  trailer_id:       z.string().uuid().optional().or(z.literal('')),
  driver_name:      z.string().optional().or(z.literal('')),
  origin:           z.string().optional().or(z.literal('')),
  destination:      z.string().optional().or(z.literal('')),
  trip_date:        z.string().optional().or(z.literal('')),
  dimensions:       dimensionsSchema,
  service_fee_cents: z.number().int().min(0).default(0),
  notes:            z.string().optional().or(z.literal('')),
  status:           z.enum(['draft', 'active']).default('active'),
  permits:          z.array(permitRowSchema).min(1, 'Add at least one state'),
})

export type NewOrderFormValues = z.infer<typeof newOrderSchema>

export const updateOrderSchema = z.object({
  status:            z.enum(['draft', 'active', 'completed', 'cancelled']).optional(),
  truck_id:          z.string().uuid().optional().nullable(),
  trailer_id:        z.string().uuid().optional().nullable(),
  driver_name:       z.string().optional().nullable(),
  origin:            z.string().optional().or(z.literal('')).nullable(),
  destination:       z.string().optional().or(z.literal('')).nullable(),
  trip_date:         z.string().optional().or(z.literal('')).nullable(),
  dimensions:        dimensionsSchema,
  service_fee_cents: z.number().int().min(0).optional(),
  notes:             z.string().optional().or(z.literal('')).nullable(),
})

export type UpdateOrderValues = z.infer<typeof updateOrderSchema>
