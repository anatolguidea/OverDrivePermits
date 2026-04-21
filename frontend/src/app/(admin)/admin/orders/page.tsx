import Link from 'next/link'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { findOrders } from '@/lib/repositories/orders.repo'
import { HydrationBoundary, QueryClient, dehydrate } from '@tanstack/react-query'
import { ordersQueryKey } from '@/lib/queries/useOrders'
import { OrdersTableWithFilters } from '@/components/admin/orders/OrdersTableWithFilters'
import { Button } from '@/components/ui/button'

export const metadata = { title: 'Orders — OSW Permits Admin' }

export default async function OrdersPage() {
  const supabase = await createClient()
  const queryClient = new QueryClient()

  await queryClient.prefetchQuery({
    queryKey: ordersQueryKey({ status: 'all', page: 1, page_size: 25 }),
    queryFn: () => findOrders(supabase, { status: 'all', page: 1, page_size: 25 }),
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Orders</h2>
          <p className="text-sm text-muted-foreground">All permit orders</p>
        </div>
        <Button asChild size="sm">
          <Link href="/admin/orders/new">
            <Plus className="mr-1.5 h-4 w-4" />
            New Order
          </Link>
        </Button>
      </div>

      <HydrationBoundary state={dehydrate(queryClient)}>
        <OrdersTableWithFilters />
      </HydrationBoundary>
    </div>
  )
}
