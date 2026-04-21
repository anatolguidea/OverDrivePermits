'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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
import type { OrderRow } from '@/lib/repositories/orders.repo'
import type { VehicleRow } from '@/lib/repositories/vehicles.repo'

const editSchema = z.object({
  vehicle_id:  z.string().optional(),
  origin:      z.string().optional(),
  destination: z.string().optional(),
  trip_date:   z.string().optional(),
  notes:       z.string().optional(),
})

type EditFormValues = z.infer<typeof editSchema>

interface OrderEditFormProps {
  order: OrderRow
  vehicles: VehicleRow[]
}

export function OrderEditForm({ order, vehicles }: OrderEditFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  const form = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      vehicle_id:  order.vehicles?.id ?? '',
      origin:      order.origin ?? '',
      destination: order.destination ?? '',
      trip_date:   order.trip_date ?? '',
      notes:       order.notes ?? '',
    },
  })

  async function onSubmit(values: EditFormValues) {
    setLoading(true)
    try {
      const payload: Record<string, unknown> = {
        origin:      values.origin      || null,
        destination: values.destination || null,
        trip_date:   values.trip_date   || null,
        notes:       values.notes       || null,
        vehicle_id:  values.vehicle_id && values.vehicle_id !== '__none__'
          ? values.vehicle_id
          : null,
      }

      const res = await fetch(`/api/admin/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)

      toast({ title: 'Order updated' })
      router.push(`/admin/orders/${order.id}`)
      router.refresh()
    } catch (err) {
      toast({ title: 'Error', description: String(err), variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="rounded-lg border border-border bg-card p-5 space-y-4">

          {/* Vehicle */}
          <FormField
            control={form.control}
            name="vehicle_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vehicle</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? ''}>
                  <FormControl>
                    <SelectTrigger className="w-72">
                      <SelectValue placeholder="No vehicle selected" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {vehicles.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.unit_number}
                        {v.make ? ` — ${v.make}` : ''}
                        {v.year ? ` ${v.year}` : ''}
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

          {/* Route */}
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="origin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Origin</FormLabel>
                  <FormControl>
                    <Input placeholder="City, State" {...field} />
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
                    <Input placeholder="City, State" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Trip date */}
          <FormField
            control={form.control}
            name="trip_date"
            render={({ field }) => (
              <FormItem className="w-48">
                <FormLabel>Trip Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Notes */}
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea rows={3} placeholder="Internal notes…" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
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
