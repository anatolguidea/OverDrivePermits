import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { findOrderById } from '@/lib/repositories/orders.repo'
import { StatusBadge } from '@/components/admin/shared/StatusBadge'
import { PermitProgressChips } from '@/components/admin/orders/PermitProgressChips'

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const order = await findOrderById(supabase, params.id)
  if (!order) notFound()

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <h2 className="text-2xl font-bold tracking-tight font-mono">{order.order_number}</h2>
        <StatusBadge status={order.status} />
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-4 space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Customer</p>
          <p className="font-medium">{order.customers.name}</p>
          {order.customers.usdot && <p className="text-sm text-muted-foreground">USDOT {order.customers.usdot}</p>}
        </div>
        <div className="rounded-lg border border-border bg-card p-4 space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Route</p>
          <p className="text-sm">{order.origin ?? '—'} → {order.destination ?? '—'}</p>
          {order.trip_date && <p className="text-sm text-muted-foreground">Trip: {order.trip_date}</p>}
        </div>
      </div>
      <div className="rounded-lg border border-border bg-card p-4 space-y-3" id="permits">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Permit Progress</p>
        <PermitProgressChips permits={order.permits} />
        <div className="mt-4 space-y-2">
          {order.permits.map((p) => (
            <div key={p.state_code} className="flex items-center justify-between text-sm">
              <span className="font-medium">{p.state_code}</span>
              <StatusBadge status={p.status} />
              <span className="text-muted-foreground font-mono">
                {p.cost != null ? `$${p.cost.toFixed(2)}` : '—'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
