'use client'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import type { InvoiceFilters, InvoicesPage } from '@/lib/repositories/invoices.repo'

export type { InvoiceFilters, InvoicesPage }

async function fetchInvoices(filters: InvoiceFilters): Promise<InvoicesPage> {
  const params = new URLSearchParams()
  if (filters.status && filters.status !== 'all') params.set('status', filters.status)
  if (filters.customer_id) params.set('customer_id', filters.customer_id)
  if (filters.search) params.set('search', filters.search)
  if (filters.page) params.set('page', String(filters.page))
  if (filters.page_size) params.set('page_size', String(filters.page_size))

  const res = await fetch(`/api/admin/invoices?${params.toString()}`)
  if (!res.ok) throw new Error('Failed to fetch invoices')
  const json = await res.json()
  return { data: json.data ?? [], total: json.total ?? 0, page: json.page ?? 1, page_size: json.page_size ?? 25 }
}

export function invoicesQueryKey(filters: InvoiceFilters) {
  return ['invoices', filters] as const
}

export function useInvoices(filters: InvoiceFilters = {}) {
  return useQuery({
    queryKey: invoicesQueryKey(filters),
    queryFn: () => fetchInvoices(filters),
    placeholderData: keepPreviousData,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    staleTime: 10_000,
  })
}
