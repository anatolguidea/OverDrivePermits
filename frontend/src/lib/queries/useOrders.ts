'use client'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { getApiErrorMessage } from '@/lib/http/client'
import type { OrderRow, OrderFilters, OrdersPage } from '@/lib/repositories/orders.repo'
import { ordersQueryKey } from './orderKeys'

export type { OrderRow, OrderFilters, OrdersPage }
export { ordersQueryKey }

async function fetchOrders(filters: OrderFilters): Promise<OrdersPage> {
  const params = new URLSearchParams()
  if (filters.status)      params.set('status',      filters.status)
  if (filters.customer_id) params.set('customer_id', filters.customer_id)
  if (filters.date_from)   params.set('date_from',   filters.date_from)
  if (filters.date_to)     params.set('date_to',     filters.date_to)
  if (filters.search)      params.set('search',      filters.search)
  if (filters.page)        params.set('page',        String(filters.page))
  if (filters.page_size)   params.set('page_size',   String(filters.page_size))

  const res = await fetch(`/api/admin/orders?${params.toString()}`, { cache: 'no-store' })
  const json = await res.json()
  if (!res.ok || json?.success === false) {
    throw new Error(getApiErrorMessage(json, 'Failed to fetch orders'))
  }
  return json
}

export function useOrders(filters: OrderFilters = {}, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ordersQueryKey(filters),
    queryFn: () => fetchOrders(filters),
    enabled: options?.enabled ?? true,
    placeholderData: keepPreviousData,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    staleTime: 10_000,
  })
}
