import type { QueryClient } from '@tanstack/react-query'

export async function invalidateAdminLiveData(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] }),
    queryClient.invalidateQueries({ queryKey: ['orders'] }),
    queryClient.invalidateQueries({ queryKey: ['invoices'] }),
  ])
}
