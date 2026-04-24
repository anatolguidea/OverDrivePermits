'use client'
import { useState, useEffect } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Search, X } from 'lucide-react'
import { useDebounce } from '@/lib/hooks/useDebounce'

interface CustomersSearchBarProps {
  defaultValue?: string
}

export function CustomersSearchBar({ defaultValue = '' }: CustomersSearchBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [value, setValue] = useState(defaultValue)
  const debounced = useDebounce(value, 350)

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('page')
    if (debounced) {
      params.set('search', debounced)
    } else {
      params.delete('search')
    }
    router.replace(`${pathname}?${params.toString()}`)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced])

  return (
    <div className="relative w-64">
      <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Name, USDOT, MC…"
        className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 pl-8 pr-8 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
      />
      {value && (
        <button
          type="button"
          onClick={() => setValue('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  )
}
