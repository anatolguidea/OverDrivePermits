import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { Skeleton } from '@/components/ui/skeleton'

export const metadata = { title: 'Dashboard — OSW Permits Admin' }

export default async function DashboardPage() {
  const supabase = await createClient()

  const [ordersRes, customersRes, invoicesRes] = await Promise.all([
    supabase.from('orders').select('id, status'),
    supabase.from('customers').select('id'),
    supabase
      .from('invoices')
      .select('total_amount, status')
      .eq('status', 'paid'),
  ])

  const activeOrders = ordersRes.data?.filter((o) => o.status === 'active').length ?? 0
  const totalCustomers = customersRes.data?.length ?? 0
  const totalRevenue =
    invoicesRes.data?.reduce((sum, inv) => sum + (inv.total_amount ?? 0), 0) ?? 0

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">Active Orders at a glance</p>
      </div>

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Active Orders" value={activeOrders} />
        <StatCard label="Total Customers" value={totalCustomers} />
        <StatCard
          label="Revenue (Paid)"
          value={`$${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
        />
      </div>

      {/* Orders table placeholder — Phase 2 */}
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <p className="text-sm text-muted-foreground">
          Orders table coming in Phase 2 — dashboard shell is live.
        </p>
      </Suspense>
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
