import { z } from 'zod'

export const credentialSchema = z.object({
  state_code: z.string().length(2, 'Select a state'),
  username:   z.string().min(1, 'Username is required'),
  password:   z.string().min(1, 'Password is required'),
  notes:      z.string().optional().or(z.literal('')),
})

export type CredentialFormValues = z.infer<typeof credentialSchema>
