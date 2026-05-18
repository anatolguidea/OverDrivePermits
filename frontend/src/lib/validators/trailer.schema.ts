import { z } from 'zod'

const VIN_REGEX = /^[A-HJ-NPR-Z0-9]{17}$/i

export const TRAILER_TYPES = ['flatbed', 'stepdeck', 'lowboy', 'curtainside', 'other'] as const

export const trailerSchema = z.object({
  unit_number:  z.string().min(1, 'Unit number is required'),
  year:         z
    .number({ error: 'Year must be a number' })
    .int()
    .min(1900, 'Year must be ≥ 1900')
    .max(new Date().getFullYear() + 1, 'Year is too far in the future')
    .optional()
    .or(z.nan().transform(() => undefined)),
  make:         z.string().optional().or(z.literal('')),
  vin:          z
    .string()
    .regex(VIN_REGEX, 'VIN must be 17 characters (A–Z, 0–9, no I/O/Q)')
    .optional()
    .or(z.literal('')),
  plate:        z.string().optional().or(z.literal('')),
  plate_state:  z.string().length(2).optional().or(z.literal('')),
  plate_expiry: z.string().optional().or(z.literal('')),
  trailer_type: z.string().optional().or(z.literal('')),
  active:       z.boolean().default(true),
})

export type TrailerFormValues = z.infer<typeof trailerSchema>

export function normalizeTrailer(values: TrailerFormValues) {
  return Object.fromEntries(
    Object.entries(values).map(([k, v]) => [
      k,
      v === '' || (typeof v === 'number' && isNaN(v)) ? null : v,
    ])
  )
}
