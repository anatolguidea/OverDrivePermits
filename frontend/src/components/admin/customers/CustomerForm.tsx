'use client'
import { useForm, type Control } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { customerSchema, type CustomerFormValues } from '@/lib/validators/customer.schema'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import type { CustomerRow } from '@/lib/repositories/customers.repo'

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC',
]

interface CustomerFormProps {
  customer?: CustomerRow
}

export function CustomerForm({ customer }: CustomerFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const isEdit = !!customer

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name:          customer?.name          ?? '',
      usdot:         customer?.usdot         ?? '',
      mc_number:     customer?.mc_number     ?? '',
      fein:          customer?.fein          ?? '',
      ifta_number:   customer?.ifta_number   ?? '',
      email:         customer?.email         ?? '',
      phone:         customer?.phone         ?? '',
      address_line1: customer?.address_line1 ?? '',
      address_line2: customer?.address_line2 ?? '',
      city:          customer?.city          ?? '',
      state_code:    customer?.state_code    ?? '',
      zip:           customer?.zip           ?? '',
    },
  })

  async function onSubmit(values: CustomerFormValues) {
    setLoading(true)
    try {
      const url = isEdit ? `/api/admin/customers/${customer!.id}` : '/api/admin/customers'
      const method = isEdit ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error?.toString())

      toast({ title: isEdit ? 'Customer updated' : 'Customer created' })
      router.push(isEdit ? `/admin/customers/${customer!.id}` : `/admin/customers/${json.data.id}`)
      router.refresh()
    } catch (err) {
      toast({ title: 'Error', description: String(err), variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Company */}
        <Section title="Company">
          <Field control={form.control} name="name"       label="Company Name *" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field control={form.control} name="usdot"      label="USDOT #"       placeholder="e.g. 1234567" />
            <Field control={form.control} name="mc_number"  label="MC #"          placeholder="e.g. 8901234" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field control={form.control} name="fein"       label="FEIN"          placeholder="XX-XXXXXXX" />
            <Field control={form.control} name="ifta_number" label="IFTA #" />
          </div>
        </Section>

        {/* Contact */}
        <Section title="Contact">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field control={form.control} name="email" label="Email" type="email" />
            <Field control={form.control} name="phone" label="Phone" type="tel" placeholder="(555) 000-0000" />
          </div>
        </Section>

        {/* Address */}
        <Section title="Address">
          <Field control={form.control} name="address_line1" label="Address Line 1" />
          <Field control={form.control} name="address_line2" label="Address Line 2" placeholder="Suite, floor, etc." />
          <div className="grid gap-4 sm:grid-cols-3">
            <Field control={form.control} name="city" label="City" />
            <FormField
              control={form.control}
              name="state_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>State</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="State" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {US_STATES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Field control={form.control} name="zip" label="ZIP" placeholder="12345" />
          </div>
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

// ---- helpers ----

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
            <Input type={type} placeholder={placeholder} {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
