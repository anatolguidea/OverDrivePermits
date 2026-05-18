'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { csrfFetch } from '@/lib/http/client'
import { useToast } from '@/hooks/use-toast'
import {
  invoiceSettingsSchema,
  type InvoiceSettingsValues,
} from '@/lib/validators/invoice-settings.schema'
import type { InvoiceSettingsRow } from '@/lib/repositories/invoice-settings.repo'

interface InvoiceSettingsFormProps {
  settings: InvoiceSettingsRow
}

export function InvoiceSettingsForm({ settings }: InvoiceSettingsFormProps) {
  const { toast } = useToast()
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  const form = useForm<InvoiceSettingsValues>({
    resolver: zodResolver(invoiceSettingsSchema),
    defaultValues: {
      company_name: settings.company_name,
      company_address: settings.company_address ?? '',
      company_logo_url: settings.company_logo_url ?? '',
      sender_name: settings.sender_name ?? '',
      sender_email: settings.sender_email ?? '',
      invoice_number_prefix: settings.invoice_number_prefix,
      next_invoice_number: settings.next_invoice_number,
    },
  })

  async function onSubmit(values: InvoiceSettingsValues) {
    setSaving(true)
    try {
      const res = await csrfFetch('/api/admin/settings/invoice', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const json = await res.json()
      if (!json.success) throw new Error(String(json.error))
      toast({ title: 'Invoice settings updated' })
      router.refresh()
    } catch (err) {
      toast({ title: 'Error', description: String(err), variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Form {...form}>
      <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="company_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Company name *</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="company_logo_url"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Company logo URL</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="https://..." />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="company_address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Company address</FormLabel>
              <FormControl>
                <Textarea {...field} rows={3} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="sender_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email sender name</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Accounts Receivable" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="sender_email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email sender address</FormLabel>
                <FormControl>
                  <Input {...field} type="email" placeholder="billing@yourdomain.com" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="invoice_number_prefix"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Invoice number prefix *</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="INV-" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="next_invoice_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Next invoice number *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    value={field.value}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save settings'}
        </Button>
      </form>
    </Form>
  )
}
