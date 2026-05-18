'use client'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback, useState, useEffect, useRef } from 'react'
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
import { useDebounce } from '@/lib/hooks/useDebounce'
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
  const searchRef = useRef<HTMLInputElement>(null)

  const status    = searchParams.get('status') ?? 'all'
  const urlSearch = searchParams.get('search') ?? ''
  const date_from = searchParams.get('date_from') ?? ''
  const date_to   = searchParams.get('date_to') ?? ''

  const [searchInput, setSearchInput] = useState(urlSearch)

  useEffect(() => {
    function onFocusSearch() { searchRef.current?.focus() }
    window.addEventListener('focus-orders-search', onFocusSearch)
    return () => window.removeEventListener('focus-orders-search', onFocusSearch)
  }, [])
  const debouncedSearch = useDebounce(searchInput, 350)

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

  useEffect(() => {
    if (debouncedSearch !== urlSearch) {
      push({ search: debouncedSearch })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch])

  function handleClear() {
    setSearchInput('')
    push({ status: null, search: null, date_from: null, date_to: null })
  }

  const hasFilters = status !== 'all' || urlSearch || date_from || date_to

  return (
    <div className="admin-toolbar">
      {/* Search */}
      <div className="relative w-52">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={searchRef}
          placeholder="Order # or customer… (/)"
          className="h-8 pl-8 text-sm"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        {searchInput && (
          <button
            type="button"
            onClick={() => { setSearchInput(''); push({ search: null }) }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        )}
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
      />
      <Input
        type="date"
        className="h-8 w-36 text-sm"
        value={date_to}
        onChange={(e) => push({ date_to: e.target.value })}
      />

      {/* Clear */}
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto h-8 gap-1 text-xs"
          onClick={handleClear}
        >
          <X className="h-3 w-3" />
          Clear
        </Button>
      )}
    </div>
  )
}
