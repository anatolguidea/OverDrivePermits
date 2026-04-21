import Link from 'next/link'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { findInvoices } from '@/lib/repositories/invoices.repo'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/admin/shared/StatusBadge'

export const metadata = { title: 'Invoices — OSW Permits Admin' }

export default async function InvoicesPage() {
  const supabase = await createClient()
  const { data: invoices } = await findInvoices(supabase, { page: 1, page_size: 50 })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Invoices</h2>
          <p className="text-sm text-muted-foreground">All invoices</p>
        </div>
        <Button asChild size="sm">
          <Link href="/admin/invoices/new">
            <Plus className="mr-1.5 h-4 w-4" />
            New Invoice
          </Link>
        </Button>
      </div>

      {invoices.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-16 text-center">
          <p className="text-sm text-muted-foreground">No invoices yet.</p>
          <Button asChild size="sm" className="mt-4">
            <Link href="/admin/invoices/new">Create your first invoice</Link>
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Invoice #</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Customer</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Order</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Total</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs font-medium">
                    {invoice.invoice_number}
                  </td>
                  <td className="px-4 py-3">
                    {invoice.customers?.name ?? <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {invoice.orders ? (
                      <Link
                        href={`/admin/orders/${invoice.order_id}`}
                        className="text-primary hover:underline"
                      >
                        {invoice.orders.order_number}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    ${invoice.total_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={invoice.status} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {invoice.issue_date}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/invoices/${invoice.id}`}
                        className="text-xs text-primary hover:underline"
                      >
                        View
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
