'use client'
import { useEffect, useState } from 'react'
import { HelpCircle } from 'lucide-react'
import { chipStyle } from '@/components/admin/orders/PermitProgressChips'
import type { PermitStatus } from '@/lib/supabase/types'

const STORAGE_KEY = 'admin-dashboard-legend-seen'

const ITEMS: Array<{ status: PermitStatus; label: string }> = [
  { status: 'pending', label: 'Pending' },
  { status: 'in_progress', label: 'In progress' },
  { status: 'submitted', label: 'Submitted' },
  { status: 'issued', label: 'Issued' },
  { status: 'rejected', label: 'Rejected' },
  { status: 'not_needed', label: 'Not needed' },
]

export function DashboardPermitLegend() {
  const [expanded, setExpanded] = useState(true)

  useEffect(() => {
    const seen = window.localStorage.getItem(STORAGE_KEY)
    if (seen) {
      setExpanded(false)
      return
    }
    window.localStorage.setItem(STORAGE_KEY, '1')
  }, [])

  return (
    <div className="admin-panel p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="admin-section-label">Permit Legend</p>
          <p className="mt-1 text-xs text-slate-500">
            Status color stays consistent across dashboard, orders, and invoices.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:text-slate-900"
          onClick={() => setExpanded((value) => !value)}
          aria-label={expanded ? 'Hide permit legend' : 'Show permit legend'}
        >
          <HelpCircle className="h-4 w-4" />
        </button>
      </div>
      {expanded ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {ITEMS.map(({ status, label }) => (
            <span
              key={status}
              className={`inline-flex items-center rounded-full px-2 py-1 text-[11px] font-medium ${chipStyle[status]}`}
            >
              {label}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}
