import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { findOrders } from '@/lib/repositories/orders.repo'
import { HydrationBoundary, QueryClient, dehydrate } from '@tanstack/react-query'
import { ordersQueryKey } from '@/lib/queries/orderKeys'
import { OrdersTableWithFilters } from '@/components/admin/orders/OrdersTableWithFilters'
import { FileText, Users, DollarSign, Clock, Send, AlertCircle } from 'lucide-react'

export const metadata = { title: 'Dashboard — OSW Permits Admin' }

export default async function DashboardPage() {
  const supabase = await createClient()
  const queryClient = new QueryClient()

  const [
    activeOrdersRes,
    totalCustomersRes,
    paidRevenueRes,
    pendingPermitsRes,
    submittedPermitsRes,
    outstandingRes,
  ] = await Promise.all([
    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('customers').select('*', { count: 'exact', head: true }),
    supabase.from('invoices').select('total_amount').eq('status', 'paid'),
    supabase.from('permits').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('permits').select('*', { count: 'exact', head: true }).eq('status', 'submitted'),
    supabase.from('invoices').select('total_amount').in('status', ['draft', 'sent']),
    queryClient.prefetchQuery({
      queryKey: ordersQueryKey({ status: 'all', page: 1, page_size: 25 }),
      queryFn: () => findOrders(supabase, { status: 'all', page: 1, page_size: 25 }),
    }),
  ])

  const activeOrders   = activeOrdersRes.count ?? 0
  const totalCustomers = totalCustomersRes.count ?? 0
  const paidRevenue    = (paidRevenueRes.data ?? []).reduce((s, i) => s + (i.total_amount ?? 0), 0)
  const pendingPermits = pendingPermitsRes.count ?? 0
  const submittedPermits = submittedPermitsRes.count ?? 0
  const outstanding    = (outstandingRes.data ?? []).reduce((s, i) => s + (i.total_amount ?? 0), 0)

  const fmt = (n: number) =>
    `$${n.toLocaleString('en-US', { minimumFractionDigits: 2 })}`

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-sm text-muted-foreground">Overview of your permit operations</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Active Orders"
          value={activeOrders}
          icon={FileText}
          href="/admin/orders?status=active"
        />
        <StatCard
          label="Total Customers"
          value={totalCustomers}
          icon={Users}
          href="/admin/customers"
        />
        <StatCard
          label="Revenue (Paid)"
          value={fmt(paidRevenue)}
          icon={DollarSign}
          href="/admin/invoices?status=paid"
          mono
        />
        <StatCard
          label="Permits Pending"
          value={pendingPermits}
          icon={Clock}
          variant={pendingPermits > 0 ? 'warning' : 'default'}
        />
        <StatCard
          label="Permits Submitted"
          value={submittedPermits}
          icon={Send}
          variant={submittedPermits > 0 ? 'info' : 'default'}
        />
        <StatCard
          label="Outstanding Invoices"
          value={fmt(outstanding)}
          icon={AlertCircle}
          href="/admin/invoices"
          variant={outstanding > 0 ? 'warning' : 'default'}
          mono
        />
      </div>

      <HydrationBoundary state={dehydrate(queryClient)}>
        <OrdersTableWithFilters />
      </HydrationBoundary>
    </div>
  )
}

type Variant = 'default' | 'warning' | 'info'

function StatCard({
  label,
  value,
  icon: Icon,
  href,
  variant = 'default',
  mono = false,
}: {
  label: string
  value: string | number
  icon: React.ElementType
  href?: string
  variant?: Variant
  mono?: boolean
}) {
  const iconColors: Record<Variant, string> = {
    default: 'text-primary',
    warning: 'text-amber-500',
    info: 'text-sky-500',
  }

  const card = (
    <div className={`rounded-lg border border-border bg-card p-5 transition-colors ${href ? 'hover:bg-muted/40 cursor-pointer' : ''}`}>
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <Icon className={`h-4 w-4 ${iconColors[variant]}`} />
      </div>
      <p className={`mt-3 text-2xl font-bold ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  )

  if (href) {
    return <Link href={href} className="block">{card}</Link>
  }

  return card
}
