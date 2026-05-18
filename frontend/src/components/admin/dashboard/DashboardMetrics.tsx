'use client'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useDashboardSummary } from '@/lib/queries/useDashboardSummary'

export function DashboardMetrics() {
  const { data, isLoading, isFetching, error, refetch } = useDashboardSummary()

  if (isLoading) {
    return (
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="admin-metric-card">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="mt-4 h-8 w-16" />
            <Skeleton className="mt-3 h-3 w-32" />
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="admin-panel flex items-center justify-between gap-3 p-4">
        <div>
          <p className="admin-section-label">Dashboard metrics</p>
          <p className="mt-1 text-sm text-destructive">Unable to load live summary.</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => void refetch()}>
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className={`grid gap-3 md:grid-cols-2 xl:grid-cols-4 ${isFetching ? 'opacity-75 transition-opacity' : ''}`}>
      <MetricCard label="Active orders" value={data?.activeOrders ?? 0} hint="Current live work" />
      <MetricCard label="Awaiting submission" value={data?.awaitingSubmission ?? 0} hint="Pending + in progress permits" />
      <MetricCard label="Permits issued today" value={data?.issuedToday ?? 0} hint="Updated since midnight" />
      <MetricCard label="Overdue invoices" value={data?.overdueInvoices ?? 0} hint="Needs follow-up" tone="warn" />
    </div>
  )
}

function MetricCard({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string
  value: number
  hint: string
  tone?: 'default' | 'warn'
}) {
  return (
    <div className="admin-metric-card">
      <p className="admin-section-label">{label}</p>
      <p className={`mt-2 text-[28px] font-semibold tracking-[-0.03em] ${tone === 'warn' ? 'text-amber-700' : 'text-slate-950'}`}>
        {value}
      </p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </div>
  )
}

