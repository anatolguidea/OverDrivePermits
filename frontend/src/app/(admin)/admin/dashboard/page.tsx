import { createClient } from '@/lib/supabase/server'
import { findOrders } from '@/lib/repositories/orders.repo'
import { HydrationBoundary, QueryClient, dehydrate } from '@tanstack/react-query'
import { ordersQueryKey } from '@/lib/queries/useOrders'
import { OrdersTableWithFilters } from '@/components/admin/orders/OrdersTableWithFilters'

export const metadata = { title: 'Dashboard — OSW Permits Admin' }

export default async function DashboardPage() {
  const supabase = await createClient()
  const queryClient = new QueryClient()

  const [ordersRes, customersRes, invoicesRes] = await Promise.all([
    supabase.from('orders').select('id, status'),
    supabase.from('customers').select('id'),
    supabase.from('invoices').select('total_amount, status').eq('status', 'paid'),
    // Prefetch first page of orders into TanStack Query cache
    queryClient.prefetchQuery({
      queryKey: ordersQueryKey({ status: 'all', page: 1, page_size: 25 }),
      queryFn: () => findOrders(supabase, { status: 'all', page: 1, page_size: 25 }),
    }),
  ])

  const activeOrders = ordersRes.data?.filter((o) => o.status === 'active').length ?? 0
  const totalCustomers = customersRes.data?.length ?? 0
  const totalRevenue =
    invoicesRes.data?.reduce((sum, inv) => sum + (inv.total_amount ?? 0), 0) ?? 0

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Active Orders</h2>
        <p className="text-sm text-muted-foreground">
          Real-time view of all permit orders
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Active Orders"    value={activeOrders} />
        <StatCard label="Total Customers"  value={totalCustomers} />
        <StatCard
          label="Revenue (Paid)"
          value={`$${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
        />
      </div>

      {/* Orders table — hydrated from server prefetch */}
      <HydrationBoundary state={dehydrate(queryClient)}>
        <OrdersTableWithFilters />
      </HydrationBoundary>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  )
}
