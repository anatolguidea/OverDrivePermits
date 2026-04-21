import { z } from 'zod'

export const updatePermitSchema = z.object({
  status:        z.enum(['pending', 'submitted', 'issued']).optional(),
  cost:          z.number().min(0).optional(),
  permit_number: z.string().optional().or(z.literal('')),
  issue_date:    z.string().optional().or(z.literal('')),
})

export type UpdatePermitValues = z.infer<typeof updatePermitSchema>

// Allowed status transitions (forward-only)
const TRANSITIONS: Record<string, string[]> = {
  pending:   ['submitted'],
  submitted: ['issued', 'pending'],
  issued:    [],
}

export function isValidTransition(from: string, to: string): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false
}
