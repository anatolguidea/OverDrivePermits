import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Pencil, Building2, Phone, Mail, MapPin } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { findCustomerById } from '@/lib/repositories/customers.repo'
import { findVehiclesByCustomer } from '@/lib/repositories/vehicles.repo'
import { findCredentialsByCustomer } from '@/lib/repositories/credentials.repo'
import { findOrders } from '@/lib/repositories/orders.repo'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { FleetTable } from '@/components/admin/customers/FleetTable'
import { CredentialsDialog } from '@/components/admin/customers/CredentialsDialog'
import { PermitProgressChips } from '@/components/admin/orders/PermitProgressChips'
import { StatusBadge } from '@/components/admin/shared/StatusBadge'
import { format } from 'date-fns'

export async function generateMetadata({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const customer = await findCustomerById(supabase, params.id)
  return { title: customer ? `${customer.name} — OSW Permits Admin` : 'Customer' }
}

export default async function CustomerDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  const [customer, vehicles, credentials, ordersPage] = await Promise.all([
    findCustomerById(supabase, params.id),
    findVehiclesByCustomer(supabase, params.id),
    findCredentialsByCustomer(supabase, params.id),
    findOrders(supabase, { customer_id: params.id, page_size: 50 }),
  ])

  if (!customer) notFound()

  const orders = ordersPage.data

  return (
    <div className="max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{customer.name}</h2>
          <div className="mt-1 flex flex-wrap gap-3 text-sm text-muted-foreground">
            {customer.usdot     && <span>USDOT {customer.usdot}</span>}
            {customer.mc_number && <span>MC {customer.mc_number}</span>}
            {customer.fein      && <span>FEIN {customer.fein}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <CredentialsDialog
            customerId={customer.id}
            customerName={customer.name}
            initialCredentials={credentials}
          />
          <Button asChild size="sm" variant="outline">
            <Link href={`/admin/customers/${customer.id}/edit`}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href={`/admin/orders/new?customer_id=${customer.id}`}>+ New Order</Link>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="fleet">Fleet ({vehicles.length})</TabsTrigger>
          <TabsTrigger value="orders">Orders ({orders.length})</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="mt-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {customer.email && (
              <InfoCard icon={<Mail className="h-4 w-4" />} label="Email" value={customer.email} />
            )}
            {customer.phone && (
              <InfoCard icon={<Phone className="h-4 w-4" />} label="Phone" value={customer.phone} />
            )}
            {(customer.address_line1 || customer.city) && (
              <InfoCard
                icon={<MapPin className="h-4 w-4" />}
                label="Address"
                value={[
                  customer.address_line1,
                  customer.address_line2,
                  [customer.city, customer.state_code, customer.zip].filter(Boolean).join(' '),
                ]
                  .filter(Boolean)
                  .join(', ')}
              />
            )}
            {customer.ifta_number && (
              <InfoCard icon={<Building2 className="h-4 w-4" />} label="IFTA #" value={customer.ifta_number} />
            )}
          </div>
        </TabsContent>

        {/* Fleet */}
        <TabsContent value="fleet" className="mt-4">
          <FleetTable customerId={customer.id} initialVehicles={vehicles} />
        </TabsContent>

        {/* Orders */}
        <TabsContent value="orders" className="mt-4">
          {orders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No orders yet.</p>
          ) : (
            <div className="rounded-md border border-border divide-y divide-border">
              {orders.map((order) => (
                <div key={order.id} className="flex items-center gap-4 px-4 py-3">
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="font-mono text-xs font-medium text-primary hover:underline w-32 shrink-0"
                  >
                    {order.order_number}
                  </Link>
                  <StatusBadge status={order.status} />
                  <span className="text-sm text-muted-foreground">
                    {order.trip_date
                      ? format(new Date(order.trip_date + 'T00:00:00'), 'MMM d, yyyy')
                      : '—'}
                  </span>
                  <PermitProgressChips permits={order.permits} className="flex-1" />
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex gap-3 rounded-lg border border-border bg-card p-4">
      <div className="mt-0.5 text-muted-foreground">{icon}</div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-1 text-sm">{value}</p>
      </div>
    </div>
  )
}
