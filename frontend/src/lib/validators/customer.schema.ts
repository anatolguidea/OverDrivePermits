import { z } from 'zod'

export const customerSchema = z.object({
  name:          z.string().min(1, 'Company name is required'),
  dba_name:      z.string().optional().or(z.literal('')),
  usdot:         z.string().regex(/^\d{1,8}$/, 'USDOT must be 1–8 digits').optional().or(z.literal('')),
  mc_number:     z.string().regex(/^\d{1,8}$/, 'MC number must be 1–8 digits').optional().or(z.literal('')),
  fein:          z.string().regex(/^\d{2}-\d{7}$/, 'FEIN format: XX-XXXXXXX').optional().or(z.literal('')),
  ifta_number:   z.string().optional().or(z.literal('')),
  // Primary contact (billing/general)
  email:         z.string().email('Enter a valid email').optional().or(z.literal('')),
  phone:         z.string().optional().or(z.literal('')),
  billing_email: z.string().email('Enter a valid billing email').optional().or(z.literal('')),
  // Named contact person
  contact_name:  z.string().optional().or(z.literal('')),
  contact_phone: z.string().optional().or(z.literal('')),
  contact_email: z.string().email('Enter a valid contact email').optional().or(z.literal('')),
  // Address
  address_line1: z.string().optional().or(z.literal('')),
  address_line2: z.string().optional().or(z.literal('')),
  city:          z.string().optional().or(z.literal('')),
  state_code:    z.string().length(2, 'Select a state').optional().or(z.literal('')),
  zip:           z.string().regex(/^\d{5}(-\d{4})?$/, 'ZIP: 12345 or 12345-6789').optional().or(z.literal('')),
  // Internal
  notes:         z.string().optional().or(z.literal('')),
})

export type CustomerFormValues = z.infer<typeof customerSchema>

export function normalizeCustomer(values: CustomerFormValues) {
  return Object.fromEntries(
    Object.entries(values).map(([k, v]) => [k, v === '' ? null : v])
  )
}
