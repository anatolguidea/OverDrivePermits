'use client'
import { useQuery } from '@tanstack/react-query'

export interface DashboardSummary {
  activeOrders: number
  awaitingSubmission: number
  issuedToday: number
  overdueInvoices: number
}

async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const response = await fetch('/api/admin/dashboard/summary', { cache: 'no-store' })
  const json = await response.json().catch(() => null)

  if (!response.ok || !json?.success) {
    throw new Error(String(json?.error ?? 'Failed to fetch dashboard summary'))
  }

  return json.data
}

export function useDashboardSummary() {
  return useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: fetchDashboardSummary,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    staleTime: 10_000,
  })
}

