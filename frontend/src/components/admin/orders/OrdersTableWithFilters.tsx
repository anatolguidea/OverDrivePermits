'use client'
import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { OrderFilters } from './OrderFilters'
import { OrdersTable } from './OrdersTable'
import type { OrderFilters as OrderFiltersType } from '@/lib/queries/useOrders'
import type { OrderStatus } from '@/lib/supabase/types'

function OrdersContent() {
  const searchParams = useSearchParams()

  const filters: OrderFiltersType = {
    status:      (searchParams.get('status') as OrderStatus | 'all') || 'all',
    customer_id: searchParams.get('customer_id') || undefined,
    date_from:   searchParams.get('date_from') || undefined,
    date_to:     searchParams.get('date_to') || undefined,
    search:      searchParams.get('search') || undefined,
    page:        searchParams.get('page') ? Number(searchParams.get('page')) : 1,
    page_size:   25,
  }

  return (
    <div className="space-y-4">
      <OrderFilters />
      <OrdersTable filters={filters} />
    </div>
  )
}

export function OrdersTableWithFilters() {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-[1.4rem] bg-white/70" />}>
      <OrdersContent />
    </Suspense>
  )
}
