import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { findOrderById } from '@/lib/repositories/orders.repo'
import { findTrucksByCustomer } from '@/lib/repositories/trucks.repo'
import { findTrailersByCustomer } from '@/lib/repositories/trailers.repo'
import { Button } from '@/components/ui/button'
import { OrderEditForm } from '@/components/admin/orders/OrderEditForm'

export async function generateMetadata({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const order = await findOrderById(supabase, params.id)
  return { title: order ? `Edit ${order.order_number} — OSW Permits Admin` : 'Edit Order' }
}

export default async function EditOrderPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  const order = await findOrderById(supabase, params.id)
  if (!order) notFound()

  const [trucks, trailers] = await Promise.all([
    findTrucksByCustomer(supabase, order.customers.id),
    findTrailersByCustomer(supabase, order.customers.id),
  ])

  return (
    <div className="max-w-2xl space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href={`/admin/orders/${order.id}`}>
          <ArrowLeft className="mr-1.5 h-4 w-4" /> {order.order_number}
        </Link>
      </Button>

      <div>
        <h2 className="text-2xl font-bold tracking-tight">Edit Order</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {order.order_number} · {order.customers.name}
        </p>
      </div>

      <OrderEditForm order={order} trucks={trucks} trailers={trailers} />
    </div>
  )
}
