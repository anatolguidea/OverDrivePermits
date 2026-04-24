import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Reports — OSW Permits Admin' }

export default async function ReportsPage() {
  const supabase = await createClient()

  const [revenueRes, topCustomersRes, permitStatusRes] = await Promise.all([
    // Revenue by month (last 6 months)
    supabase
      .from('invoices')
      .select('issue_date, total_amount, status')
      .eq('status', 'paid')
      .gte('issue_date', getMonthsAgo(6))
      .order('issue_date', { ascending: true }),

    // Top customers by order count
    supabase
      .from('orders')
      .select('customer_id, customers(name)')
      .order('created_at', { ascending: false })
      .limit(200),

    // Permit status breakdown
    supabase
      .from('permits')
      .select('status'),
  ])

  // Revenue grouped by month
  const revenueByMonth = groupRevenueByMonth(revenueRes.data ?? [])

  // Top customers
  const customerCounts: Record<string, { name: string; count: number }> = {}
  for (const order of (topCustomersRes.data ?? []) as unknown as Array<{ customer_id: string; customers: { name: string } | null }>) {
    const id = order.customer_id
    const name = order.customers?.name ?? 'Unknown'
    if (!customerCounts[id]) customerCounts[id] = { name, count: 0 }
    customerCounts[id].count++
  }
  const topCustomers = Object.values(customerCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // Permit status
  const permitBreakdown: Record<string, number> = {}
  for (const p of (permitStatusRes.data ?? [])) {
    permitBreakdown[p.status] = (permitBreakdown[p.status] ?? 0) + 1
  }

  const total6mRevenue = (revenueRes.data ?? []).reduce((s, i) => s + (i.total_amount ?? 0), 0)

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Reports</h2>
        <p className="text-sm text-muted-foreground">Operations overview</p>
      </div>

      {/* Revenue summary */}
      <section className="space-y-3">
        <h3 className="text-base font-semibold">Revenue — Last 6 Months</h3>
        <p className="text-sm text-muted-foreground">
          Total collected:{' '}
          <span className="font-mono font-semibold text-foreground">
            ${total6mRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        </p>
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Month</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Paid Revenue</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Invoices</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {revenueByMonth.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No paid invoices yet.
                  </td>
                </tr>
              ) : (
                revenueByMonth.map((row) => (
                  <tr key={row.month} className="hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium">{row.month}</td>
                    <td className="px-4 py-3 text-right font-mono">
                      ${row.revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{row.count}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Top customers */}
        <section className="space-y-3">
          <h3 className="text-base font-semibold">Top Customers by Orders</h3>
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">#</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Customer</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Orders</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {topCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      No orders yet.
                    </td>
                  </tr>
                ) : (
                  topCustomers.map((c, i) => (
                    <tr key={c.name} className="hover:bg-muted/20">
                      <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                      <td className="px-4 py-3 font-medium">{c.name}</td>
                      <td className="px-4 py-3 text-right font-mono">{c.count}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Permit status breakdown */}
        <section className="space-y-3">
          <h3 className="text-base font-semibold">Permit Status Breakdown</h3>
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {Object.keys(permitBreakdown).length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      No permits yet.
                    </td>
                  </tr>
                ) : (
                  Object.entries(permitBreakdown)
                    .sort(([, a], [, b]) => b - a)
                    .map(([status, count]) => (
                      <tr key={status} className="hover:bg-muted/20">
                        <td className="px-4 py-3 capitalize font-medium">{status}</td>
                        <td className="px-4 py-3 text-right font-mono">{count}</td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}

function getMonthsAgo(n: number): string {
  const d = new Date()
  d.setMonth(d.getMonth() - n)
  return d.toISOString().split('T')[0]
}

function groupRevenueByMonth(
  invoices: Array<{ issue_date: string; total_amount: number | null }>
) {
  const map: Record<string, { revenue: number; count: number }> = {}
  for (const inv of invoices) {
    const month = inv.issue_date.slice(0, 7) // "YYYY-MM"
    if (!map[month]) map[month] = { revenue: 0, count: 0 }
    map[month].revenue += inv.total_amount ?? 0
    map[month].count++
  }
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, { revenue, count }]) => ({
      month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      revenue,
      count,
    }))
}
