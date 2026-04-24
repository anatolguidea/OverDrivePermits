'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { newInvoiceSchema, type NewInvoiceValues } from '@/lib/validators/invoice.schema'
import type { CustomerOption } from '@/lib/queries/useCustomers'

export interface OrderOption {
  id: string
  order_number: string
  customer_id: string
}

interface InvoiceFormProps {
  customers: CustomerOption[]
  orders?: OrderOption[]
  initialCustomerId?: string
  initialOrderId?: string
}

export function InvoiceForm({ customers, orders = [], initialCustomerId, initialOrderId }: InvoiceFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [submitting, setSubmitting] = useState(false)

  const today = new Date().toISOString().split('T')[0]

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    control,
  } = useForm<NewInvoiceValues>({
    resolver: zodResolver(newInvoiceSchema),
    defaultValues: {
      status: 'draft',
      issue_date: today,
      tax: 0,
      customer_id: initialCustomerId,
      order_id: initialOrderId ?? null,
      line_items: [{ description: '', quantity: 1, unit_price: 0, position: 0 }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'line_items' })

  const watchedCustomerId = watch('customer_id')
  const watchedLineItems = watch('line_items')
  const watchedTax = watch('tax') ?? 0

  const filteredOrders = watchedCustomerId
    ? orders.filter((o) => o.customer_id === watchedCustomerId)
    : []

  const lineItemsSubtotal = watchedLineItems.reduce((sum, item) => {
    const qty = Number(item.quantity) || 0
    const price = Number(item.unit_price) || 0
    return sum + qty * price
  }, 0)

  const runningTotal = lineItemsSubtotal + (Number(watchedTax) || 0)

  async function onSubmit(values: NewInvoiceValues) {
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const json = await res.json()
      if (!json.success) throw new Error(typeof json.error === 'string' ? json.error : 'Validation error')
      toast({ title: `Invoice ${json.data.invoice_number} created` })
      router.push(`/admin/invoices/${json.data.id}`)
    } catch (err) {
      toast({ title: 'Error', description: String(err), variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Customer & Order */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="customer_id">Customer *</Label>
          <Select
            value={watchedCustomerId ?? ''}
            onValueChange={(val) => {
              setValue('customer_id', val, { shouldValidate: true })
              setValue('order_id', null)
            }}
          >
            <SelectTrigger id="customer_id">
              <SelectValue placeholder="Select customer…" />
            </SelectTrigger>
            <SelectContent>
              {customers.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.customer_id && (
            <p className="text-xs text-destructive">{errors.customer_id.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="order_id">Order (optional)</Label>
          <Select
            value={watch('order_id') ?? 'none'}
            onValueChange={(val) => setValue('order_id', val === 'none' ? null : val)}
            disabled={filteredOrders.length === 0}
          >
            <SelectTrigger id="order_id">
              <SelectValue placeholder={filteredOrders.length === 0 ? 'Select customer first' : 'None'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {filteredOrders.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.order_number}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Dates & Status */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="issue_date">Issue Date *</Label>
          <Input id="issue_date" type="date" {...register('issue_date')} />
          {errors.issue_date && (
            <p className="text-xs text-destructive">{errors.issue_date.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="due_date">Due Date</Label>
          <Input id="due_date" type="date" {...register('due_date')} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="status">Status</Label>
          <Select
            defaultValue="draft"
            onValueChange={(val) =>
              setValue('status', val as 'draft' | 'sent' | 'paid', { shouldValidate: true })
            }
          >
            <SelectTrigger id="status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tax */}
      <div className="max-w-xs space-y-1.5">
        <Label htmlFor="tax">Tax ($)</Label>
        <Input
          id="tax"
          type="number"
          min="0"
          step="0.01"
          {...register('tax', { valueAsNumber: true })}
        />
        {errors.tax && (
          <p className="text-xs text-destructive">{errors.tax.message}</p>
        )}
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" rows={3} placeholder="Optional notes…" {...register('notes')} />
      </div>

      {/* Line Items */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Line Items *</Label>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              append({ description: '', quantity: 1, unit_price: 0, position: fields.length })
            }
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add Item
          </Button>
        </div>

        {errors.line_items && !Array.isArray(errors.line_items) && (
          <p className="text-xs text-destructive">{errors.line_items.message}</p>
        )}

        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Description</th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground w-24">Qty</th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground w-32">Unit Price</th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground w-32">Subtotal</th>
                <th className="px-3 py-2 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {fields.map((field, index) => {
                const qty = Number(watchedLineItems[index]?.quantity) || 0
                const price = Number(watchedLineItems[index]?.unit_price) || 0
                const rowSubtotal = qty * price
                return (
                  <tr key={field.id}>
                    <td className="px-3 py-2">
                      <Input
                        placeholder="Description"
                        className="h-8 text-sm"
                        {...register(`line_items.${index}.description`)}
                      />
                      {errors.line_items?.[index]?.description && (
                        <p className="mt-0.5 text-xs text-destructive">
                          {errors.line_items[index]?.description?.message}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        min="0.01"
                        step="0.01"
                        className="h-8 text-sm text-right"
                        {...register(`line_items.${index}.quantity`, { valueAsNumber: true })}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        className="h-8 text-sm text-right"
                        {...register(`line_items.${index}.unit_price`, { valueAsNumber: true })}
                      />
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-sm">
                      ${rowSubtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => remove(index)}
                        disabled={fields.length === 1}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Running totals */}
        <div className="flex justify-end">
          <div className="w-64 space-y-1 rounded-lg border border-border bg-muted/20 p-3 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span className="font-mono">
                ${lineItemsSubtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Tax</span>
              <span className="font-mono">
                ${(Number(watchedTax) || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between border-t border-border pt-1 font-semibold">
              <span>Total</span>
              <span className="font-mono">
                ${runningTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Submit */}
      <div className="flex gap-3">
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Creating…' : 'Create Invoice'}
        </Button>
      </div>
    </form>
  )
}
