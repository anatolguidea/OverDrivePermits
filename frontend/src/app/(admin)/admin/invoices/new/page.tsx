import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/server'
import { InvoiceForm } from '@/components/admin/invoices/InvoiceForm'
import type { CustomerOption } from '@/lib/queries/useCustomers'
import type { OrderOption } from '@/components/admin/invoices/InvoiceForm'

export const metadata = { title: 'New Invoice — OSW Permits Admin' }

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: { order_id?: string }
}) {
  const supabase = await createClient()

  const [customersResult, ordersResult] = await Promise.all([
    supabase
      .from('customers')
      .select('id, name, usdot')
      .order('name', { ascending: true })
      .limit(200),
    supabase
      .from('orders')
      .select('id, order_number, customer_id')
      .order('created_at', { ascending: false })
      .limit(200),
  ])

  const customers: CustomerOption[] = (customersResult.data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    usdot: c.usdot,
  }))

  const orders: OrderOption[] = (ordersResult.data ?? []).map((o) => ({
    id: o.id,
    order_number: o.order_number,
    customer_id: o.customer_id,
  }))

  // Pre-populate form if coming from an order
  let initialOrderId: string | undefined
  let initialCustomerId: string | undefined

  if (searchParams.order_id) {
    const linkedOrder = orders.find((o) => o.id === searchParams.order_id)
    if (linkedOrder) {
      initialOrderId = linkedOrder.id
      initialCustomerId = linkedOrder.customer_id
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/admin/invoices">
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Invoices
        </Link>
      </Button>

      <div>
        <h2 className="text-2xl font-bold tracking-tight">New Invoice</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Create an invoice and add line items.
        </p>
      </div>

      <InvoiceForm
        customers={customers}
        orders={orders}
        initialCustomerId={initialCustomerId}
        initialOrderId={initialOrderId}
      />
    </div>
  )
}
