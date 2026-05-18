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
    <div className="space-y-5">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/admin/orders">
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Orders
        </Link>
      </Button>

      <div className="admin-page-header">
        <div>
          <p className="admin-section-label">Order</p>
          <div className="flex items-center gap-3">
            <h1 className="admin-page-title admin-mono">
              {order.order_number}
            </h1>
            <StatusBadge status={order.status} />
          </div>
          <p className="admin-page-meta">
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
          {order.trucks ? (
            <>
              <p className="font-medium">{order.trucks.unit_number}</p>
              <p className="text-xs capitalize text-muted-foreground">
                truck{order.driver_name ? ` · ${order.driver_name}` : ''}
              </p>
            </>
          ) : order.trailers ? (
            <>
              <p className="font-medium">{order.trailers.unit_number}</p>
              <p className="text-xs capitalize text-muted-foreground">
                trailer{order.driver_name ? ` · ${order.driver_name}` : ''}
              </p>
            </>
          ) : order.driver_name ? (
            <p className="font-medium">{order.driver_name}</p>
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

      <div className="admin-panel flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">Progress</span>
          <PermitProgressChips
            permits={permits.map((p) => ({
              id:            p.id,
              jurisdiction:  p.jurisdiction,
              status:        p.status,
              cost:          p.cost,
              sort_order:    p.sort_order,
              permit_number: p.permit_number,
              document_url:  p.document_url,
            }))}
          />
        </div>
        <div className="text-right">
          {totalCost > 0 && (
            <p className="font-mono text-sm font-semibold">
              Permits: ${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          )}
          {order.service_fee_cents > 0 && (
            <p className="font-mono text-xs text-muted-foreground">
              Service fee: ${(order.service_fee_cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          )}
        </div>
      </div>

      <div id="permits">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold">Permits ({permits.length})</h3>
        </div>
        <div className="mb-1 grid grid-cols-[24px_64px_120px_180px_140px_auto] gap-3 px-4 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">
          <span />
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

      {order.notes && (
        <div className="admin-panel p-4">
          <p className="mb-1 admin-section-label">Notes</p>
          <p className="whitespace-pre-wrap text-sm">{order.notes}</p>
        </div>
      )}
    </div>
  )
}

function InfoCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="admin-panel p-4">
      <p className="mb-2 admin-section-label">{label}</p>
      {children}
    </div>
  )
}
