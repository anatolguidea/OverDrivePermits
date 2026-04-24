'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/admin/shared/StatusBadge'
import { ConfirmDialog } from '@/components/admin/shared/ConfirmDialog'
import { useToast } from '@/hooks/use-toast'
import type { InvoiceDetail as InvoiceDetailType } from '@/lib/repositories/invoices.repo'

interface InvoiceDetailProps {
  invoice: InvoiceDetailType
}

export function InvoiceDetail({ invoice: initialInvoice }: InvoiceDetailProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [invoice, setInvoice] = useState(initialInvoice)
  const [loading, setLoading] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  async function transitionStatus(status: 'sent' | 'paid') {
    setLoading(true)
    try {
      const body: Record<string, string> = { status }
      if (status === 'paid') {
        body.paid_at = new Date().toISOString()
      }
      const res = await fetch(`/api/admin/invoices/${invoice.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      setInvoice((prev) => ({ ...prev, ...json.data }))
      toast({ title: `Invoice marked ${status}` })
      router.refresh()
    } catch (err) {
      toast({ title: 'Error', description: String(err), variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/invoices/${invoice.id}`, { method: 'DELETE' })
      if (!res.ok && res.status !== 204) {
        const json = await res.json()
        throw new Error(json.error)
      }
      toast({ title: 'Invoice deleted' })
      router.push('/admin/invoices')
    } catch (err) {
      toast({ title: 'Error', description: String(err), variant: 'destructive' })
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-bold font-mono">{invoice.invoice_number}</h3>
            <StatusBadge status={invoice.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {invoice.customers?.name ?? 'Unknown customer'}
          </p>
          {invoice.orders && (
            <p className="text-sm text-muted-foreground">
              Order:{' '}
              <Link
                href={`/admin/orders/${invoice.order_id}`}
                className="text-primary hover:underline font-mono"
              >
                {invoice.orders.order_number}
              </Link>
            </p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {invoice.status === 'draft' && (
            <Button
              size="sm"
              variant="outline"
              disabled={loading}
              onClick={() => transitionStatus('sent')}
            >
              Mark Sent
            </Button>
          )}
          {(invoice.status === 'draft' || invoice.status === 'sent') && (
            <Button
              size="sm"
              disabled={loading}
              onClick={() => transitionStatus('paid')}
            >
              Mark Paid
            </Button>
          )}
          <Button
            size="sm"
            variant="destructive"
            disabled={loading}
            onClick={() => setDeleteOpen(true)}
          >
            Delete
          </Button>
        </div>
      </div>

      {/* Date info */}
      <div className="grid grid-cols-3 gap-4 rounded-lg border border-border bg-muted/20 p-4 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">Issue Date</p>
          <p className="mt-0.5 font-medium">{invoice.issue_date}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Due Date</p>
          <p className="mt-0.5 font-medium">{invoice.due_date ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Paid At</p>
          <p className="mt-0.5 font-medium">
            {invoice.paid_at
              ? new Date(invoice.paid_at).toLocaleDateString('en-US')
              : '—'}
          </p>
        </div>
      </div>

      {/* Line items */}
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Description</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground w-24">Qty</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground w-32">Unit Price</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground w-32">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {invoice.invoice_line_items.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3">{item.description}</td>
                <td className="px-4 py-3 text-right font-mono">{item.quantity}</td>
                <td className="px-4 py-3 text-right font-mono">
                  ${item.unit_price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </td>
                <td className="px-4 py-3 text-right font-mono">
                  ${item.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="flex justify-end">
        <div className="w-64 space-y-1 rounded-lg border border-border bg-muted/20 p-4 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span className="font-mono">
              ${invoice.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Tax</span>
            <span className="font-mono">
              ${invoice.tax.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between border-t border-border pt-1 font-bold">
            <span>Total</span>
            <span className="font-mono">
              ${invoice.total_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete invoice"
        description={`Delete invoice ${invoice.invoice_number}? This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        loading={loading}
        onConfirm={handleDelete}
      />

      {/* Notes */}
      {invoice.notes && (
        <div className="rounded-lg border border-border bg-muted/20 p-4">
          <p className="text-xs font-medium text-muted-foreground mb-1">Notes</p>
          <p className="text-sm whitespace-pre-wrap">{invoice.notes}</p>
        </div>
      )}
    </div>
  )
}
