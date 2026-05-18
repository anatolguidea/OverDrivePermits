'use client'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { csrfFetch, getThrownMessage, parseApiResponse } from '@/lib/http/client'
import { invalidateAdminLiveData } from '@/lib/queries/invalidation'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronDown, ChevronRight } from 'lucide-react'
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
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { updateOrderSchema, type UpdateOrderValues } from '@/lib/validators/order.schema'
import type { OrderRow } from '@/lib/repositories/orders.repo'
import type { TruckRow } from '@/lib/repositories/trucks.repo'
import type { TrailerRow } from '@/lib/repositories/trailers.repo'

interface OrderEditFormProps {
  order: OrderRow
  trucks: TruckRow[]
  trailers: TrailerRow[]
}

type Dims = NonNullable<UpdateOrderValues['dimensions']>

function parseDims(raw: unknown): Dims | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const d = raw as Record<string, unknown>
  return {
    length:         Number(d.length ?? 0),
    width:          Number(d.width ?? 0),
    height:         Number(d.height ?? 0),
    weight:         Number(d.weight ?? 0),
    overhang_front: Number(d.overhang_front ?? 0),
    overhang_rear:  Number(d.overhang_rear ?? 0),
    overhang_left:  Number(d.overhang_left ?? 0),
    overhang_right: Number(d.overhang_right ?? 0),
  }
}

export function OrderEditForm({ order, trucks, trailers }: OrderEditFormProps) {
  const NONE_VALUE = '__none__'
  const router = useRouter()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [loading, setLoading] = useState(false)
  const [dimensionsOpen, setDimensionsOpen] = useState(!!order.dimensions)

  const form = useForm<UpdateOrderValues>({
    resolver: zodResolver(updateOrderSchema),
    defaultValues: {
      truck_id:          order.trucks?.id ?? '',
      trailer_id:        order.trailers?.id ?? '',
      driver_name:       order.driver_name ?? '',
      origin:            order.origin ?? '',
      destination:       order.destination ?? '',
      trip_date:         order.trip_date ?? '',
      service_fee_cents: order.service_fee_cents ?? 0,
      notes:             order.notes ?? '',
      dimensions:        parseDims(order.dimensions),
    },
  })

  async function onSubmit(values: UpdateOrderValues) {
    if (loading) return
    setLoading(true)
    try {
      const payload: Record<string, unknown> = {
        origin:            values.origin      || null,
        destination:       values.destination || null,
        trip_date:         values.trip_date   || null,
        driver_name:       values.driver_name || null,
        notes:             values.notes       || null,
        truck_id:          values.truck_id    || null,
        trailer_id:        values.trailer_id  || null,
        service_fee_cents: values.service_fee_cents ?? 0,
        dimensions:        values.dimensions ?? null,
      }

      const res = await csrfFetch(`/api/admin/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      await parseApiResponse(res, 'Failed to update order')

      await invalidateAdminLiveData(queryClient)
      toast({ title: 'Order updated' })
      router.push(`/admin/orders/${order.id}`)
      router.refresh()
    } catch (err) {
      toast({ title: 'Error', description: getThrownMessage(err), variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="rounded-lg border border-border bg-card p-5 space-y-4">

          {/* Truck + Trailer */}
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="truck_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Truck</FormLabel>
                  <Select
                    onValueChange={(v) => field.onChange(v === NONE_VALUE ? '' : v)}
                    value={field.value || NONE_VALUE}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="No truck selected" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NONE_VALUE}>None</SelectItem>
                      {trucks.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.unit_number}
                          {t.make ? ` — ${t.make}` : ''}
                          {t.year ? ` ${t.year}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="trailer_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Trailer</FormLabel>
                  <Select
                    onValueChange={(v) => field.onChange(v === NONE_VALUE ? '' : v)}
                    value={field.value || NONE_VALUE}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="No trailer selected" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NONE_VALUE}>None</SelectItem>
                      {trailers.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.unit_number}
                          {t.trailer_type ? ` — ${t.trailer_type}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Driver */}
          <FormField
            control={form.control}
            name="driver_name"
            render={({ field }) => (
              <FormItem className="max-w-72">
                <FormLabel>Driver Name</FormLabel>
                <FormControl>
                  <Input placeholder="John Smith" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Route */}
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="origin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Origin</FormLabel>
                  <FormControl>
                    <Input placeholder="City, State" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="destination"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Destination</FormLabel>
                  <FormControl>
                    <Input placeholder="City, State" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Trip date + Service fee */}
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="trip_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Trip Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="service_fee_cents"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Service Fee ($)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={field.value ? (field.value / 100).toFixed(2) : ''}
                      onChange={(e) => {
                        const dollars = parseFloat(e.target.value)
                        field.onChange(isNaN(dollars) ? 0 : Math.round(dollars * 100))
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Notes */}
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea rows={3} placeholder="Internal notes…" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Dimensions (collapsible) */}
          <div>
            <button
              type="button"
              onClick={() => setDimensionsOpen((o) => !o)}
              className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {dimensionsOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              Load Dimensions
            </button>
            {dimensionsOpen && (
              <div className="mt-3 grid gap-3 sm:grid-cols-4">
                {(
                  [
                    { name: 'dimensions.length',         label: 'Length (ft)' },
                    { name: 'dimensions.width',          label: 'Width (ft)'  },
                    { name: 'dimensions.height',         label: 'Height (ft)' },
                    { name: 'dimensions.weight',         label: 'Weight (lbs)'},
                  ] as const
                ).map(({ name, label }) => (
                  <FormField
                    key={name}
                    control={form.control}
                    name={name}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">{label}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.1"
                            min="0"
                            placeholder="0"
                            value={field.value ?? ''}
                            onChange={(e) => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
                <p className="col-span-4 text-xs text-muted-foreground">Overhang</p>
                {(
                  [
                    { name: 'dimensions.overhang_front', label: 'Front (ft)' },
                    { name: 'dimensions.overhang_rear',  label: 'Rear (ft)'  },
                    { name: 'dimensions.overhang_left',  label: 'Left (ft)'  },
                    { name: 'dimensions.overhang_right', label: 'Right (ft)' },
                  ] as const
                ).map(({ name, label }) => (
                  <FormField
                    key={name}
                    control={form.control}
                    name={name}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">{label}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.1"
                            min="0"
                            placeholder="0"
                            value={field.value ?? ''}
                            onChange={(e) => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving…' : 'Save Changes'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={loading}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  )
}
