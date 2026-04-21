import { z } from 'zod'

const VIN_REGEX = /^[A-HJ-NPR-Z0-9]{17}$/i

export const vehicleSchema = z.object({
  unit_number:  z.string().min(1, 'Unit number is required'),
  vehicle_type: z.enum(['truck', 'trailer']),
  vin:          z.string().regex(VIN_REGEX, 'VIN must be 17 characters (A–Z, 0–9, no I/O/Q)').optional().or(z.literal('')),
  plate_number: z.string().optional().or(z.literal('')),
  make:         z.string().optional().or(z.literal('')),
  year:         z
    .number({ error: 'Year must be a number' })
    .int()
    .min(1900, 'Year must be ≥ 1900')
    .max(new Date().getFullYear() + 1, 'Year is too far in the future')
    .optional()
    .or(z.nan().transform(() => undefined)),
})

export type VehicleFormValues = z.infer<typeof vehicleSchema>

export function normalizeVehicle(values: VehicleFormValues) {
  return Object.fromEntries(
    Object.entries(values).map(([k, v]) => [k, v === '' || (typeof v === 'number' && isNaN(v)) ? null : v])
  )
}
