import { cn } from '@/lib/utils'
import type { PermitStatus } from '@/lib/supabase/types'

export interface PermitChip {
  id: string
  jurisdiction: string
  status: PermitStatus
  cost: number | null
  sort_order: number
  permit_number: string | null
  document_url: string | null
}

export const chipStyle: Record<PermitStatus, string> = {
  pending:     'bg-slate-100 text-slate-600 border border-slate-200',
  in_progress: 'bg-amber-50 text-amber-700 border border-amber-200',
  submitted:   'bg-blue-50 text-blue-700 border border-blue-200',
  issued:      'bg-emerald-50 text-emerald-700 border border-emerald-200',
  rejected:    'bg-rose-50 text-rose-700 border border-rose-200',
  not_needed:  'bg-slate-50 text-slate-400 border border-slate-200 line-through',
}

export const dotStyle: Record<PermitStatus, string> = {
  pending:     'bg-slate-400',
  in_progress: 'bg-amber-500',
  submitted:   'bg-blue-500',
  issued:      'bg-emerald-500',
  rejected:    'bg-rose-500',
  not_needed:  'bg-slate-300',
}

interface PermitProgressChipsProps {
  permits: PermitChip[]
  className?: string
  onPermitClick?: (permit: PermitChip) => void
}

export function PermitProgressChips({ permits, className, onPermitClick }: PermitProgressChipsProps) {
  if (!permits.length) {
    return <span className="text-xs text-muted-foreground">—</span>
  }

  const sorted = [...permits].sort((a, b) =>
    a.sort_order !== b.sort_order
      ? a.sort_order - b.sort_order
      : a.jurisdiction.localeCompare(b.jurisdiction)
  )
  const issuedCount = permits.filter((p) => p.status === 'issued').length

  return (
    <div className={cn('flex flex-wrap items-center gap-1', className)}>
      {sorted.map((permit) =>
        onPermitClick ? (
          <button
            key={permit.id}
            type="button"
            title={`${permit.jurisdiction} — ${permit.status.replace('_', ' ')}${permit.cost != null ? ` — $${permit.cost.toFixed(2)}` : ''}`}
            onClick={(e) => { e.stopPropagation(); onPermitClick(permit) }}
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs font-medium',
              'transition-opacity hover:opacity-75 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
              chipStyle[permit.status]
            )}
          >
            <span className={cn('h-1.5 w-1.5 rounded-full', dotStyle[permit.status])} />
            {permit.jurisdiction}
          </button>
        ) : (
          <span
            key={permit.id}
            title={`${permit.jurisdiction} — ${permit.status.replace('_', ' ')}${permit.cost != null ? ` — $${permit.cost.toFixed(2)}` : ''}`}
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs font-medium',
              chipStyle[permit.status]
            )}
          >
            <span className={cn('h-1.5 w-1.5 rounded-full', dotStyle[permit.status])} />
            {permit.jurisdiction}
          </span>
        )
      )}
      {permits.length > 1 && (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {issuedCount}/{permits.length}
        </span>
      )}
    </div>
  )
}
