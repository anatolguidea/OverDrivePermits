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

export function useCustomerOptions(search?: string) {
  return useQuery({
    queryKey: ['customer-options', search ?? ''],
    queryFn: () => fetchCustomerOptions(search),
    staleTime: 60_000,
  })
}

export interface VehicleOption {
  id: string
  unit_number: string
  vehicle_type: string
  make: string | null
  year: number | null
}

async function fetchVehiclesForCustomer(customerId: string): Promise<VehicleOption[]> {
  const res = await fetch(`/api/admin/vehicles?customer_id=${customerId}`)
  if (!res.ok) throw new Error('Failed to fetch vehicles')
  const json = await res.json()
  return json.data ?? []
}

export function useVehiclesForCustomer(customerId: string | undefined) {
  return useQuery<VehicleOption[]>({
    queryKey: ['vehicles', customerId],
    queryFn: () => fetchVehiclesForCustomer(customerId!),
    enabled: !!customerId,
    staleTime: 60_000,
  })
}
