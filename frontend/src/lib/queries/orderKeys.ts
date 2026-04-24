import type { OrderFilters } from '@/lib/repositories/orders.repo'

export function ordersQueryKey(filters: OrderFilters) {
  return ['orders', filters] as const
}
