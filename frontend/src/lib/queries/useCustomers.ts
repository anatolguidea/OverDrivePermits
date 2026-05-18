'use client'
import { useQuery } from '@tanstack/react-query'
import { getApiErrorMessage } from '@/lib/http/client'

export interface CustomerOption {
  id: string
  name: string
  usdot: string | null
}

async function fetchCustomerOptions(search?: string): Promise<CustomerOption[]> {
  const params = new URLSearchParams()
  if (search) params.set('search', search)
  params.set('page_size', '50')
  const res = await fetch(`/api/admin/customers?${params}`, { cache: 'no-store' })
  const json = await res.json()
  if (!res.ok || json?.success === false) {
    throw new Error(getApiErrorMessage(json, 'Failed to fetch customers'))
  }
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
  const res = await fetch(`/api/admin/trucks?customer_id=${customerId}`, { cache: 'no-store' })
  const json = await res.json()
  if (!res.ok || json?.success === false) {
    throw new Error(getApiErrorMessage(json, 'Failed to fetch trucks'))
  }
  return json.data ?? []
}

async function fetchTrailersForCustomer(customerId: string): Promise<TrailerOption[]> {
  const res = await fetch(`/api/admin/trailers?customer_id=${customerId}`, { cache: 'no-store' })
  const json = await res.json()
  if (!res.ok || json?.success === false) {
    throw new Error(getApiErrorMessage(json, 'Failed to fetch trailers'))
  }
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
