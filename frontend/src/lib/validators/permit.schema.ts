import { z } from 'zod'

export const PERMIT_STATUSES = ['pending', 'in_progress', 'submitted', 'issued', 'rejected', 'not_needed'] as const

export const updatePermitSchema = z.object({
  status:        z.enum(PERMIT_STATUSES).optional(),
  cost:          z.number().min(0).optional(),
  permit_number: z.string().optional().or(z.literal('')),
  issue_date:    z.string().optional().or(z.literal('')),
  valid_from:    z.string().optional().or(z.literal('')),
  valid_until:   z.string().optional().or(z.literal('')),
  sort_order:    z.number().int().min(0).optional(),
})

export type UpdatePermitValues = z.infer<typeof updatePermitSchema>

const TRANSITIONS: Record<string, string[]> = {
  pending:     ['in_progress', 'submitted', 'not_needed'],
  in_progress: ['submitted', 'pending'],
  submitted:   ['issued', 'rejected', 'pending'],
  issued:      [],
  rejected:    ['pending'],
  not_needed:  [],
}

export function isValidTransition(from: string, to: string): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false
}
