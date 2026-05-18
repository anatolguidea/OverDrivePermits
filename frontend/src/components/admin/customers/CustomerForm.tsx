'use client'
import { useForm, type Control } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { customerSchema, type CustomerFormValues } from '@/lib/validators/customer.schema'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { US_STATES } from '@/lib/constants/us-states'
import type { CustomerRow } from '@/lib/repositories/customers.repo'
import { csrfFetch, getThrownMessage, parseApiResponse } from '@/lib/http/client'

interface CustomerFormProps {
  customer?: CustomerRow
}

export function CustomerForm({ customer }: CustomerFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [loading, setLoading] = useState(false)
  const isEdit = !!customer

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name:          customer?.name          ?? '',
      dba_name:      customer?.dba_name      ?? '',
      usdot:         customer?.usdot         ?? '',
      mc_number:     customer?.mc_number     ?? '',
      fein:          '',  // write-only — never pre-filled to avoid leaking plaintext legacy value
      ifta_number:   customer?.ifta_number   ?? '',
      email:         customer?.email         ?? '',
      phone:         customer?.phone         ?? '',
      billing_email: customer?.billing_email ?? '',
      contact_name:  customer?.contact_name  ?? '',
      contact_phone: customer?.contact_phone ?? '',
      contact_email: customer?.contact_email ?? '',
      address_line1: customer?.address_line1 ?? '',
      address_line2: customer?.address_line2 ?? '',
      city:          customer?.city          ?? '',
      state_code:    customer?.state_code    ?? '',
      zip:           customer?.zip           ?? '',
      notes:         customer?.notes         ?? '',
    },
  })

  async function onSubmit(values: CustomerFormValues) {
    if (loading) return
    setLoading(true)
    try {
      const url = isEdit ? `/api/admin/customers/${customer!.id}` : '/api/admin/customers'
      const method = isEdit ? 'PATCH' : 'POST'
      // Don't send fein if blank — avoids overwriting an existing encrypted value with null
      const payload = { ...values }
      if (!payload.fein) delete payload.fein

      const res = await csrfFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await parseApiResponse<{ id: string }>(res, 'Failed to save customer')

      await queryClient.invalidateQueries({ queryKey: ['customer-options'] })
      toast({ title: isEdit ? 'Customer updated' : 'Customer created' })
      router.push(isEdit ? `/admin/customers/${customer!.id}` : `/admin/customers/${data.id}`)
      router.refresh()
    } catch (err) {
      toast({ title: 'Error', description: getThrownMessage(err), variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

        <Section title="Company">
          <Field control={form.control} name="name"     label="Company Name *" />
          <Field control={form.control} name="dba_name" label="DBA Name" placeholder="Doing business as…" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field control={form.control} name="usdot"     label="USDOT #" placeholder="e.g. 1234567" />
            <Field control={form.control} name="mc_number" label="MC #"    placeholder="e.g. 8901234" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field control={form.control} name="fein"
              label="FEIN (write-only)"
              placeholder={isEdit ? '•••••••• (leave blank to keep)' : 'XX-XXXXXXX'} />
            <Field control={form.control} name="ifta_number" label="IFTA #" />
          </div>
        </Section>

        <Section title="Primary Contact">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field control={form.control} name="email"         label="General Email"  type="email" />
            <Field control={form.control} name="billing_email" label="Billing Email"  type="email" />
          </div>
          <Field control={form.control} name="phone" label="Phone" type="tel" placeholder="(555) 000-0000" />
        </Section>

        <Section title="Named Contact Person">
          <Field control={form.control} name="contact_name" label="Contact Name" placeholder="Jane Smith" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field control={form.control} name="contact_phone" label="Contact Phone" type="tel" placeholder="(555) 000-0000" />
            <Field control={form.control} name="contact_email" label="Contact Email"  type="email" />
          </div>
        </Section>

        <Section title="Address">
          <Field control={form.control} name="address_line1" label="Address Line 1" />
          <Field control={form.control} name="address_line2" label="Address Line 2" placeholder="Suite, floor, etc." />
          <div className="grid gap-4 sm:grid-cols-3">
            <Field control={form.control} name="city" label="City" />
            <FormField control={form.control} name="state_code" render={({ field }) => (
              <FormItem>
                <FormLabel>State</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? ''}>
                  <FormControl><SelectTrigger><SelectValue placeholder="State" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {US_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <Field control={form.control} name="zip" label="ZIP" placeholder="12345" />
          </div>
        </Section>

        <Section title="Internal Notes">
          <FormField control={form.control} name="notes" render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea placeholder="Internal notes (not visible to customer)…" rows={3}
                  {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </Section>

        <div className="flex gap-3">
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Customer'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      <div className="space-y-4">{children}</div>
    </div>
  )
}

function Field({
  control,
  name,
  label,
  type = 'text',
  placeholder,
}: {
  control: Control<CustomerFormValues>
  name: keyof CustomerFormValues
  label: string
  type?: string
  placeholder?: string
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input type={type} placeholder={placeholder} {...field} value={field.value as string ?? ''} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
