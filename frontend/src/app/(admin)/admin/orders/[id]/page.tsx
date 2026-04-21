import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Pencil, ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { findOrderById } from '@/lib/repositories/orders.repo'
import { findPermitsByOrder, getPermitDocumentSignedUrl } from '@/lib/repositories/permits.repo'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/admin/shared/StatusBadge'
import { PermitProgressChips } from '@/components/admin/orders/PermitProgressChips'
import { PermitManagement, type PermitManagementRow } from '@/components/admin/orders/PermitManagement'
import { OrderStatusControl } from '@/components/admin/orders/OrderStatusControl'
import { format } from 'date-fns'

export async function generateMetadata({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const order = await findOrderById(supabase, params.id)
  return { title: order ? `${order.order_number} — OSW Permits Admin` : 'Order' }
}

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  const [order, permits] = await Promise.all([
    findOrderById(supabase, params.id),
    findPermitsByOrder(supabase, params.id),
  ])

  if (!order) notFound()

  // Generate signed URLs for permits that have documents (silently skip if Storage not wired)
  const signedUrls: Record<string, string> = {}
  await Promise.all(
    permits
      .filter((p) => p.document_url)
      .map(async (p) => {
        try {
          signedUrls[p.id] = await getPermitDocumentSignedUrl(supabase, p.document_url!)
        } catch {
          // Storage bucket not configured yet — skip
        }
      })
  )

  const totalCost = permits.reduce((sum, p) => sum + (p.cost ?? 0), 0)

  return (
    <div className="max-w-4xl space-y-6">
      {/* Back */}
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/admin/orders">
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Orders
        </Link>
      </Button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="font-mono text-2xl font-bold tracking-tight">
              {order.order_number}
            </h2>
            <StatusBadge status={order.status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Created {format(new Date(order.created_at), 'MMM d, yyyy')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <OrderStatusControl orderId={order.id} currentStatus={order.status} />
          <Button asChild size="sm" variant="outline">
            <Link href={`/admin/orders/${order.id}/edit`}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href={`/admin/invoices/new?order_id=${order.id}`}>
              Create Invoice
            </Link>
          </Button>
        </div>
      </div>

      {/* Info cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <InfoCard label="Customer">
          <Link
            href={`/admin/customers/${order.customers.id}`}
            className="font-medium hover:underline"
          >
            {order.customers.name}
          </Link>
          {order.customers.usdot && (
            <p className="text-xs text-muted-foreground">USDOT {order.customers.usdot}</p>
          )}
        </InfoCard>

        <InfoCard label="Vehicle">
          {order.vehicles ? (
            <>
              <p className="font-medium">{order.vehicles.unit_number}</p>
              <p className="text-xs capitalize text-muted-foreground">{order.vehicles.vehicle_type}</p>
            </>
          ) : (
            <p className="text-muted-foreground">—</p>
          )}
        </InfoCard>

        <InfoCard label="Route">
          {order.origin && order.destination ? (
            <p className="text-sm">{order.origin} → {order.destination}</p>
          ) : (
            <p className="text-muted-foreground">—</p>
          )}
          {order.trip_date && (
            <p className="text-xs text-muted-foreground">
              {format(new Date(order.trip_date + 'T00:00:00'), 'MMM d, yyyy')}
            </p>
          )}
        </InfoCard>
      </div>

      {/* Permit progress summary bar */}
      <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">Progress</span>
          <PermitProgressChips
            permits={permits.map((p) => ({
              state_code: p.state_code,
              status: p.status,
              cost: p.cost,
            }))}
          />
        </div>
        {totalCost > 0 && (
          <span className="font-mono text-sm font-semibold">
            Total: ${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        )}
      </div>

      {/* Permit rows */}
      <div id="permits">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold">Permits ({permits.length})</h3>
        </div>
        {/* Column header */}
        <div className="mb-1 grid grid-cols-[64px_120px_180px_140px_auto] gap-3 px-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <span>State</span>
          <span>Status</span>
          <span>Permit #</span>
          <span>Cost</span>
          <span />
        </div>
        <PermitManagement
          orderId={order.id}
          initialPermits={permits as PermitManagementRow[]}
          documentSignedUrls={signedUrls}
        />
      </div>

      {/* Notes */}
      {order.notes && (
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Notes</p>
          <p className="whitespace-pre-wrap text-sm">{order.notes}</p>
        </div>
      )}
    </div>
  )
}

function InfoCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      {children}
    </div>
  )
}
