'use client'
import { useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Check, ChevronsUpDown } from 'lucide-react'
import { newOrderSchema, type NewOrderFormValues } from '@/lib/validators/order.schema'
import { useCustomerOptions, useVehiclesForCustomer } from '@/lib/queries/useCustomers'
import { PermitRowsEditor, type PermitRow } from './PermitRowsEditor'
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC',
]

export function NewOrderWizard() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerPopoverOpen, setCustomerPopoverOpen] = useState(false)

  const { data: customers = [] } = useCustomerOptions(customerSearch)

  const form = useForm<NewOrderFormValues>({
    resolver: zodResolver(newOrderSchema),
    defaultValues: {
      customer_id: searchParams.get('customer_id') ?? '',
      vehicle_id:  '',
      origin:      '',
      destination: '',
      trip_date:   '',
      notes:       '',
      status:      'active',
      permits:     [],
    },
  })

  const selectedCustomerId = form.watch('customer_id')
  const { data: vehicles = [] } = useVehiclesForCustomer(selectedCustomerId || undefined)

  const [selectedStates, setSelectedStates] = useState<string[]>([])

  function toggleState(state: string) {
    const permits = form.getValues('permits')
    if (selectedStates.includes(state)) {
      setSelectedStates((prev) => prev.filter((s) => s !== state))
      form.setValue('permits', permits.filter((p) => p.state_code !== state), { shouldValidate: true })
    } else {
      setSelectedStates((prev) => [...prev, state].sort())
      const existing = permits.find((p) => p.state_code === state)
      if (!existing) {
        form.setValue(
          'permits',
          [...permits, { state_code: state, cost: undefined }].sort((a, b) =>
            a.state_code.localeCompare(b.state_code)
          ),
          { shouldValidate: true }
        )
      }
    }
  }

  const handlePermitRowsChange = useCallback(
    (rows: PermitRow[]) => {
      form.setValue('permits', rows, { shouldValidate: true })
      setSelectedStates(rows.map((r) => r.state_code))
    },
    [form]
  )

  async function onSubmit(values: NewOrderFormValues) {
    setLoading(true)
    try {
      const payload = {
        order: {
          customer_id: values.customer_id,
          vehicle_id:  values.vehicle_id || null,
          status:      values.status,
          origin:      values.origin || null,
          destination: values.destination || null,
          route_states: values.permits.map((p) => p.state_code),
          trip_date:   values.trip_date || null,
          notes:       values.notes || null,
        },
        permits: values.permits.map((p) => ({
          state_code: p.state_code,
          cost:       p.cost ?? null,
        })),
      }

      // Call the atomic RPC via Supabase (routed through our API)
      const res = await fetch('/api/admin/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error?.toString() ?? 'Failed to create order')

      toast({ title: `Order ${json.data.order_number} created` })
      router.push(`/admin/orders/${json.data.order_id}`)
      router.refresh()
    } catch (err) {
      toast({ title: 'Error', description: String(err), variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId)
  const permitErrors = form.formState.errors.permits?.message

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

        {/* ── 1. Customer ── */}
        <Section title="1. Customer" subtitle="Who is this order for?">
          <FormField
            control={form.control}
            name="customer_id"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Customer *</FormLabel>
                <Popover open={customerPopoverOpen} onOpenChange={setCustomerPopoverOpen}>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        role="combobox"
                        className={cn(
                          'w-72 justify-between font-normal',
                          !field.value && 'text-muted-foreground'
                        )}
                      >
                        {selectedCustomer ? selectedCustomer.name : 'Select customer…'}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 p-0">
                    <Command>
                      <CommandInput
                        placeholder="Search by name or USDOT…"
                        onValueChange={setCustomerSearch}
                      />
                      <CommandList>
                        <CommandEmpty>No customers found.</CommandEmpty>
                        <CommandGroup>
                          {customers.map((c) => (
                            <CommandItem
                              key={c.id}
                              value={c.name}
                              onSelect={() => {
                                field.onChange(c.id)
                                form.setValue('vehicle_id', '')
                                setCustomerPopoverOpen(false)
                              }}
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  field.value === c.id ? 'opacity-100' : 'opacity-0'
                                )}
                              />
                              <span className="flex-1">{c.name}</span>
                              {c.usdot && (
                                <span className="ml-2 text-xs text-muted-foreground">
                                  {c.usdot}
                                </span>
                              )}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </Section>

        {/* ── 2. Vehicle ── */}
        {selectedCustomerId && (
          <Section title="2. Vehicle" subtitle="Optional — assign a truck or trailer">
            <FormField
              control={form.control}
              name="vehicle_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vehicle</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-72">
                        <SelectValue placeholder="No vehicle selected" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {vehicles.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.unit_number}
                          {v.make ? ` — ${v.make}` : ''}
                          {v.year  ? ` ${v.year}`  : ''}
                          <span className="ml-1 capitalize text-muted-foreground">
                            ({v.vehicle_type})
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </Section>
        )}

        {/* ── 3. Route ── */}
        {selectedCustomerId && (
          <Section title="3. Route Details">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField control={form.control} name="origin" render={({ field }) => (
                <FormItem>
                  <FormLabel>Origin</FormLabel>
                  <FormControl><Input placeholder="City, State" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="destination" render={({ field }) => (
                <FormItem>
                  <FormLabel>Destination</FormLabel>
                  <FormControl><Input placeholder="City, State" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField control={form.control} name="trip_date" render={({ field }) => (
                <FormItem>
                  <FormLabel>Trip Date</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Initial Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl><Textarea rows={2} placeholder="Internal notes…" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </Section>
        )}

        {/* ── 4. States ── */}
        {selectedCustomerId && (
          <Section
            title="4. States & Permits"
            subtitle="Select the states this load will pass through"
          >
            <div className="flex flex-wrap gap-1.5">
              {US_STATES.map((state) => {
                const active = selectedStates.includes(state)
                return (
                  <button
                    key={state}
                    type="button"
                    onClick={() => toggleState(state)}
                    className={cn(
                      'rounded-md border px-2.5 py-1 font-mono text-xs font-medium transition-colors',
                      active
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground'
                    )}
                  >
                    {state}
                  </button>
                )
              })}
            </div>

            {selectedStates.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-sm font-medium">
                  Permit costs ({selectedStates.length} state{selectedStates.length !== 1 ? 's' : ''})
                </p>
                <Controller
                  control={form.control}
                  name="permits"
                  render={({ field, fieldState }) => (
                    <PermitRowsEditor
                      rows={field.value}
                      onChange={handlePermitRowsChange}
                      error={fieldState.error?.message}
                    />
                  )}
                />
              </div>
            )}

            {permitErrors && !selectedStates.length && (
              <p className="text-sm text-destructive">{permitErrors}</p>
            )}
          </Section>
        )}

        {/* ── Submit ── */}
        {selectedCustomerId && (
          <div className="flex gap-3">
            <Button type="submit" disabled={loading || !selectedStates.length}>
              {loading ? 'Creating…' : 'Create Order'}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>
              Cancel
            </Button>
          </div>
        )}
      </form>
    </Form>
  )
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="space-y-4 rounded-lg border border-border bg-card p-5">{children}</div>
    </div>
  )
}
