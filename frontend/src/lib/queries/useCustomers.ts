'use client'
import { useQuery } from '@tanstack/react-query'

export interface CustomerOption {
  id: string
  name: string
  usdot: string | null
}

async function fetchCustomerOptions(search?: string): Promise<CustomerOption[]> {
  const params = new URLSearchParams()
  if (search) params.set('search', search)
  params.set('page_size', '50')
  const res = await fetch(`/api/admin/customers?${params}`)
  if (!res.ok) throw new Error('Failed to fetch customers')
  const json = await res.json()
  return json.data ?? []
}

export function useCustomerOptions(search?: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['customer-options', search ?? ''],
    queryFn: () => fetchCustomerOptions(search),
    enabled: options?.enabled ?? true,
    staleTime: 60_000,
  })
}

export interface TruckOption {
  id: string
  unit_number: string
  make: string | null
  year: number | null
}

export interface TrailerOption {
  id: string
  unit_number: string
  trailer_type: string | null
}

async function fetchTrucksForCustomer(customerId: string): Promise<TruckOption[]> {
  const res = await fetch(`/api/admin/trucks?customer_id=${customerId}`)
  if (!res.ok) throw new Error('Failed to fetch trucks')
  const json = await res.json()
  return json.data ?? []
}

async function fetchTrailersForCustomer(customerId: string): Promise<TrailerOption[]> {
  const res = await fetch(`/api/admin/trailers?customer_id=${customerId}`)
  if (!res.ok) throw new Error('Failed to fetch trailers')
  const json = await res.json()
  return json.data ?? []
}

export function useTrucksForCustomer(customerId: string | undefined) {
  return useQuery<TruckOption[]>({
    queryKey: ['trucks', customerId],
    queryFn: () => fetchTrucksForCustomer(customerId!),
    enabled: !!customerId,
    staleTime: 60_000,
  })
}

export function useTrailersForCustomer(customerId: string | undefined) {
  return useQuery<TrailerOption[]>({
    queryKey: ['trailers', customerId],
    queryFn: () => fetchTrailersForCustomer(customerId!),
    enabled: !!customerId,
    staleTime: 60_000,
  })
}
