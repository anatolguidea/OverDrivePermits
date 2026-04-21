'use client'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import type { OrderStatus } from '@/lib/supabase/types'

const ORDER_STATUSES: { value: OrderStatus | 'all'; label: string }[] = [
  { value: 'all',       label: 'All Statuses' },
  { value: 'draft',     label: 'Draft' },
  { value: 'active',    label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

export function OrderFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const status    = searchParams.get('status') ?? 'all'
  const search    = searchParams.get('search') ?? ''
  const date_from = searchParams.get('date_from') ?? ''
  const date_to   = searchParams.get('date_to') ?? ''

  const push = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString())
      params.delete('page')
      Object.entries(updates).forEach(([k, v]) => {
        if (v === null || v === '' || v === 'all') {
          params.delete(k)
        } else {
          params.set(k, v)
        }
      })
      router.push(`${pathname}?${params.toString()}`)
    },
    [router, pathname, searchParams]
  )

  const hasFilters = status !== 'all' || search || date_from || date_to

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Search */}
      <div className="relative w-52">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Order # or customer…"
          className="h-8 pl-8 text-sm"
          value={search}
          onChange={(e) => push({ search: e.target.value })}
        />
      </div>

      {/* Status */}
      <Select value={status} onValueChange={(v) => push({ status: v })}>
        <SelectTrigger className="h-8 w-36 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ORDER_STATUSES.map(({ value, label }) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Date range */}
      <Input
        type="date"
        className="h-8 w-36 text-sm"
        value={date_from}
        onChange={(e) => push({ date_from: e.target.value })}
        placeholder="From"
      />
      <Input
        type="date"
        className="h-8 w-36 text-sm"
        value={date_to}
        onChange={(e) => push({ date_to: e.target.value })}
        placeholder="To"
      />

      {/* Clear */}
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1 text-xs"
          onClick={() => push({ status: null, search: null, date_from: null, date_to: null })}
        >
          <X className="h-3 w-3" />
          Clear
        </Button>
      )}
    </div>
  )
}
