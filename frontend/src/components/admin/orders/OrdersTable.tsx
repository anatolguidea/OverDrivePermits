'use client'
import Link from 'next/link'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import {
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Eye,
  Pencil,
  FileText,
  Receipt,
  Plus,
} from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/admin/shared/StatusBadge'
import { EmptyState } from '@/components/admin/shared/EmptyState'
import { PermitProgressChips } from './PermitProgressChips'
import { useOrders, type OrderFilters } from '@/lib/queries/useOrders'
import { format } from 'date-fns'

interface OrdersTableProps {
  filters: OrderFilters
}

export function OrdersTable({ filters }: OrdersTableProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { data, isLoading, isFetching } = useOrders(filters)

  function setPage(page: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(page))
    router.push(`${pathname}?${params.toString()}`)
  }

  if (isLoading) return <TableSkeleton />

  const orders = data?.data ?? []
  const total = data?.total ?? 0
  const page = filters.page ?? 1
  const page_size = filters.page_size ?? 25
  const totalPages = Math.ceil(total / page_size)

  const hasActiveFilters = !!(filters.status && filters.status !== 'all') ||
    !!filters.search || !!filters.date_from || !!filters.date_to

  if (!orders.length) {
    return (
      <EmptyState
        title="No orders found"
        description={hasActiveFilters ? 'No orders match your current filters.' : 'No orders yet.'}
        action={
          <div className="flex gap-2">
            {hasActiveFilters && (
              <Button variant="outline" size="sm" asChild>
                <Link href="/admin/orders">Clear filters</Link>
              </Button>
            )}
            <Button size="sm" asChild>
              <Link href="/admin/orders/new">
                <Plus className="mr-1 h-3.5 w-3.5" /> New Order
              </Link>
            </Button>
          </div>
        }
      />
    )
  }

  return (
    <div className={isFetching ? 'opacity-70 transition-opacity' : ''}>
      <div className="rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-32">Order #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="w-36">Vehicle</TableHead>
              <TableHead className="w-28">Trip Date</TableHead>
              <TableHead className="w-40">Route</TableHead>
              <TableHead className="min-w-48">Permit Progress</TableHead>
              <TableHead className="w-24 text-right">Total Cost</TableHead>
              <TableHead className="w-28">Invoice</TableHead>
              <TableHead className="w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => {
              const totalCost = order.permits.reduce(
                (sum, p) => sum + (p.cost ?? 0),
                0
              )
              const invoice = order.invoices?.[0] ?? null

              return (
                <TableRow key={order.id} className="group">
                  <TableCell>
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="font-mono text-xs font-medium text-primary hover:underline"
                    >
                      {order.order_number}
                    </Link>
                    <div className="mt-0.5">
                      <StatusBadge status={order.status} />
                    </div>
                  </TableCell>

                  <TableCell>
                    <Link
                      href={`/admin/customers/${order.customers.id}`}
                      className="text-sm font-medium hover:underline"
                    >
                      {order.customers.name}
                    </Link>
                    {order.customers.usdot && (
                      <p className="text-xs text-muted-foreground">
                        USDOT {order.customers.usdot}
                      </p>
                    )}
                  </TableCell>

                  <TableCell className="text-sm">
                    {order.vehicles ? (
                      <>
                        <span>{order.vehicles.unit_number}</span>
                        <p className="text-xs capitalize text-muted-foreground">
                          {order.vehicles.vehicle_type}
                        </p>
                      </>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>

                  <TableCell className="text-sm">
                    {order.trip_date
                      ? format(new Date(order.trip_date + 'T00:00:00'), 'MMM d, yyyy')
                      : <span className="text-muted-foreground">—</span>}
                  </TableCell>

                  <TableCell className="text-xs text-muted-foreground">
                    {order.origin && order.destination ? (
                      <span title={`${order.origin} → ${order.destination}`} className="line-clamp-1">
                        {order.origin} → {order.destination}
                      </span>
                    ) : (
                      '—'
                    )}
                  </TableCell>

                  <TableCell>
                    <PermitProgressChips permits={order.permits} />
                  </TableCell>

                  <TableCell className="text-right font-mono text-sm">
                    {totalCost > 0
                      ? `$${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                      : <span className="text-muted-foreground">—</span>}
                  </TableCell>

                  <TableCell>
                    {invoice ? (
                      <StatusBadge status={invoice.status} />
                    ) : (
                      <span className="text-xs text-muted-foreground">None</span>
                    )}
                  </TableCell>

                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/orders/${order.id}`}>
                            <Eye className="mr-2 h-3.5 w-3.5" /> View Order
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/orders/${order.id}/edit`}>
                            <Pencil className="mr-2 h-3.5 w-3.5" /> Edit Order
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/orders/${order.id}#permits`}>
                            <FileText className="mr-2 h-3.5 w-3.5" /> Manage Permits
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/invoices/new?order_id=${order.id}`}>
                            <Receipt className="mr-2 h-3.5 w-3.5" /> Create Invoice
                          </Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing {(page - 1) * page_size + 1}–{Math.min(page * page_size, total)} of {total}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-2 text-xs">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function TableSkeleton() {
  return (
    <div className="space-y-2 rounded-md border border-border p-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  )
}
