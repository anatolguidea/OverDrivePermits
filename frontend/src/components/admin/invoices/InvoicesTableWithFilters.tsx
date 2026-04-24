'use client'
import Link from 'next/link'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Search,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/admin/shared/StatusBadge'
import { EmptyState } from '@/components/admin/shared/EmptyState'
import { useInvoices } from '@/lib/queries/useInvoices'
import { useDebounce } from '@/lib/hooks/useDebounce'
import type { InvoiceStatus } from '@/lib/supabase/types'

const STATUSES: { value: InvoiceStatus | 'all'; label: string }[] = [
  { value: 'all',   label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent',  label: 'Sent' },
  { value: 'paid',  label: 'Paid' },
]

export function InvoicesTableWithFilters() {
  const router   = useRouter()
  const pathname = usePathname()
  const sp       = useSearchParams()

  const status   = (sp.get('status') as InvoiceStatus | 'all') ?? 'all'
  const urlSearch = sp.get('search') ?? ''
  const page     = sp.get('page') ? Number(sp.get('page')) : 1
  const page_size = 25

  const [searchInput, setSearchInput] = useState(urlSearch)
  const debouncedSearch = useDebounce(searchInput, 350)

  function pushParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(sp.toString())
    params.delete('page')
    Object.entries(updates).forEach(([k, v]) => {
      if (!v || v === 'all') params.delete(k)
      else params.set(k, v)
    })
    router.push(`${pathname}?${params.toString()}`)
  }

  useEffect(() => {
    if (debouncedSearch !== urlSearch) {
      pushParams({ search: debouncedSearch })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch])

  const filters = {
    status: status === 'all' ? undefined : status,
    search: urlSearch || undefined,
    page,
    page_size,
  }

  const { data, isLoading, isFetching } = useInvoices(filters)
  const invoices   = data?.data ?? []
  const total      = data?.total ?? 0
  const totalPages = Math.ceil(total / page_size)
  const hasFilters = status !== 'all' || !!urlSearch

  if (isLoading) {
    return (
      <div className="space-y-2 rounded-md border border-border p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-52">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Invoice #…"
            className="h-8 pl-8 text-sm"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => { setSearchInput(''); pushParams({ search: null }) }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        <Select value={status} onValueChange={(v) => pushParams({ status: v })}>
          <SelectTrigger className="h-8 w-36 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map(({ value, label }) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 text-xs"
            onClick={() => { setSearchInput(''); pushParams({ status: null, search: null }) }}
          >
            <X className="h-3 w-3" /> Clear
          </Button>
        )}

        <span className="ml-auto text-xs text-muted-foreground">{total} invoice{total !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      {invoices.length === 0 ? (
        <EmptyState
          title="No invoices found"
          description={hasFilters ? 'Try adjusting your filters.' : 'No invoices yet.'}
          action={
            <Button size="sm" asChild>
              <Link href="/admin/invoices/new">Create first invoice</Link>
            </Button>
          }
        />
      ) : (
        <div className={`rounded-lg border border-border bg-card overflow-hidden ${isFetching ? 'opacity-70 transition-opacity' : ''}`}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Invoice #</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Customer</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Order</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Total</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                <th className="px-4 py-3 w-20" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-muted/20 transition-colors group">
                  <td className="px-4 py-3 font-mono text-xs font-medium text-primary">
                    <Link href={`/admin/invoices/${invoice.id}`} className="hover:underline">
                      {invoice.invoice_number}
                    </Link>
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
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {invoice.issue_date}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/invoices/${invoice.id}`}
                      className="text-xs text-primary hover:underline opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing {(page - 1) * page_size + 1}–{Math.min(page * page_size, total)} of {total}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={page <= 1}
              onClick={() => pushParams({ page: String(page - 1) })}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-2 text-xs">{page} / {totalPages}</span>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={page >= totalPages}
              onClick={() => pushParams({ page: String(page + 1) })}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
