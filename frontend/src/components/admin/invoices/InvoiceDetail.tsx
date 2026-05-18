'use client'
import { useState } from 'react'
import { csrfFetch } from '@/lib/http/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Download } from 'lucide-react'
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
      const res = await csrfFetch(`/api/admin/invoices/${invoice.id}`, {
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
      const res = await csrfFetch(`/api/admin/invoices/${invoice.id}`, { method: 'DELETE' })
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

  async function sendInvoice() {
    setLoading(true)
    try {
      const res = await csrfFetch(`/api/admin/invoices/${invoice.id}/send`, { method: 'POST' })
      const json = await res.json()
      if (!json.success) throw new Error(String(json.error))
      if (json.data?.invoice) {
        setInvoice((prev) => ({ ...prev, ...json.data.invoice }))
      }
      toast({
        title: 'Invoice sent',
        description: `Sent to ${json.data?.sent_to ?? 'customer billing email'}`,
      })
      router.refresh()
    } catch (err) {
      toast({ title: 'Error', description: String(err), variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="admin-page-header">
        <div className="space-y-1">
          <p className="admin-section-label">Invoice</p>
          <div className="flex items-center gap-3">
            <h1 className="text-[24px] font-semibold admin-mono tracking-[-0.03em] text-slate-950">{invoice.invoice_number}</h1>
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

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" asChild>
            <a href={`/api/admin/invoices/${invoice.id}/pdf`} target="_blank" rel="noreferrer">
              <Download className="mr-1.5 h-3.5 w-3.5" />
              PDF
            </a>
          </Button>
          {(invoice.status === 'draft' || invoice.status === 'sent' || invoice.status === 'overdue') && (
            <Button
              size="sm"
              variant="outline"
              disabled={loading}
              onClick={sendInvoice}
            >
              Send Invoice
            </Button>
          )}
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

      <div className="grid grid-cols-3 gap-4 admin-panel p-4 text-sm">
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

      <div className="admin-table-wrap">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">Description</th>
              <th className="px-4 py-3 text-right text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500 w-24">Qty</th>
              <th className="px-4 py-3 text-right text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500 w-32">Unit Price</th>
              <th className="px-4 py-3 text-right text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500 w-32">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {invoice.invoice_line_items.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3">{item.description}</td>
                <td className="px-4 py-3 text-right admin-mono">{item.quantity}</td>
                <td className="px-4 py-3 text-right admin-mono">
                  ${item.unit_price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </td>
                <td className="px-4 py-3 text-right admin-mono">
                  ${item.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end">
        <div className="w-64 space-y-1 admin-panel p-4 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span className="admin-mono">
              ${invoice.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Tax</span>
            <span className="admin-mono">
              ${invoice.tax.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between border-t border-border pt-1 font-bold">
            <span>Total</span>
            <span className="admin-mono">
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

      {invoice.notes && (
        <div className="admin-panel p-4">
          <p className="mb-1 admin-section-label">Notes</p>
          <p className="text-sm whitespace-pre-wrap">{invoice.notes}</p>
        </div>
      )}
    </div>
  )
}
