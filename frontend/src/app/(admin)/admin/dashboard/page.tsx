import Link from 'next/link'
import { ArrowRight, Keyboard, Plus } from 'lucide-react'
import { OrdersTable } from '@/components/admin/orders/OrdersTable'
import { Button } from '@/components/ui/button'
import { DashboardPermitLegend } from '@/components/admin/dashboard/DashboardPermitLegend'
import { DashboardMetrics } from '@/components/admin/dashboard/DashboardMetrics'

export const metadata = { title: 'Dashboard — OSW Permits Admin' }
export const dynamic = 'force-dynamic'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { page?: string }
}) {
  const page = searchParams.page ? Number(searchParams.page) : 1

  return (
    <div className="space-y-5">
      <section className="admin-page-header">
        <div>
          <p className="admin-section-label">Dashboard</p>
          <h1 className="admin-page-title">Active order board</h1>
          <p className="admin-page-meta">
            Operator-first queue for permit work in motion. Shortcuts: <span className="admin-mono">N</span> new order,
            <span className="admin-mono"> / </span> search, <span className="admin-mono">⌘K</span> jump palette.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild size="sm">
            <Link href="/admin/orders/new">
              <Plus className="mr-1.5 h-4 w-4" />
              New Order
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/admin/orders">
              Full orders queue
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
        <DashboardMetrics />

        <div className="admin-panel p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-slate-700">
              <Keyboard className="h-4 w-4" />
            </div>
            <div>
              <p className="admin-section-label">Operator Rhythm</p>
              <p className="mt-1 text-sm font-medium text-slate-950">Keep the queue keyboard-led.</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Use the dashboard for triage, the permit drawer for fast status updates, and the full order page only when details change.
              </p>
            </div>
          </div>
        </div>
      </div>

      <DashboardPermitLegend />

      <section className="admin-panel">
        <div className="admin-page-header px-4 pb-3 pt-4 sm:px-5">
          <div>
            <p className="admin-section-label">Primary Queue</p>
            <h2 className="text-lg font-semibold tracking-tight text-slate-950">Active orders</h2>
            <p className="admin-page-meta">Newest active work, route order preserved in the permit strip.</p>
          </div>
        </div>

        <div className="px-4 pb-4 sm:px-5">
          <OrdersTable filters={{ status: 'active', page, page_size: 25 }} />
        </div>
      </section>
    </div>
  )
}
