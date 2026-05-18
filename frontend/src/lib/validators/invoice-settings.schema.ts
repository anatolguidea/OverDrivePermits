import { z } from 'zod'

export const invoiceSettingsSchema = z.object({
  company_name: z.string().min(1, 'Company name is required'),
  company_address: z.string().optional().or(z.literal('')),
  company_logo_url: z
    .string()
    .url('Logo must be a valid URL')
    .optional()
    .or(z.literal('')),
  sender_name: z.string().optional().or(z.literal('')),
  sender_email: z
    .string()
    .email('Sender email must be valid')
    .optional()
    .or(z.literal('')),
  invoice_number_prefix: z
    .string()
    .min(1, 'Prefix is required')
    .max(20, 'Prefix must be at most 20 characters'),
  next_invoice_number: z
    .number({ error: 'Next invoice number must be a number' })
    .int('Next invoice number must be a whole number')
    .gt(0, 'Next invoice number must be greater than 0'),
})

export type InvoiceSettingsValues = z.infer<typeof invoiceSettingsSchema>

export function normalizeInvoiceSettings(values: InvoiceSettingsValues) {
  return {
    company_name: values.company_name.trim(),
    company_address: values.company_address?.trim() || null,
    company_logo_url: values.company_logo_url?.trim() || null,
    sender_name: values.sender_name?.trim() || null,
    sender_email: values.sender_email?.trim() || null,
    invoice_number_prefix: values.invoice_number_prefix.trim(),
    next_invoice_number: values.next_invoice_number,
  }
}
