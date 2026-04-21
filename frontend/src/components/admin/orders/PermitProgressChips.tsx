import { cn } from '@/lib/utils'
import type { PermitStatus } from '@/lib/supabase/types'

interface Permit {
  state_code: string
  status: PermitStatus
  cost: number | null
}

const chipStyle: Record<PermitStatus, string> = {
  pending:   'bg-slate-100 text-slate-500 border border-slate-200',
  submitted: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  issued:    'bg-green-50 text-green-700 border border-green-200',
}

const dotStyle: Record<PermitStatus, string> = {
  pending:   'bg-slate-400',
  submitted: 'bg-yellow-500',
  issued:    'bg-green-500',
}

interface PermitProgressChipsProps {
  permits: Permit[]
  className?: string
}

export function PermitProgressChips({ permits, className }: PermitProgressChipsProps) {
  if (!permits.length) {
    return <span className="text-xs text-muted-foreground">—</span>
  }

  const sorted = [...permits].sort((a, b) => a.state_code.localeCompare(b.state_code))
  const issuedCount = permits.filter((p) => p.status === 'issued').length

  return (
    <div className={cn('flex flex-wrap items-center gap-1', className)}>
      {sorted.map((permit) => (
        <span
          key={permit.state_code}
          title={`${permit.state_code} — ${permit.status}${permit.cost != null ? ` — $${permit.cost.toFixed(2)}` : ''}`}
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs font-medium',
            chipStyle[permit.status]
          )}
        >
          <span className={cn('h-1.5 w-1.5 rounded-full', dotStyle[permit.status])} />
          {permit.state_code}
        </span>
      ))}
      {permits.length > 1 && (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {issuedCount}/{permits.length}
        </span>
      )}
    </div>
  )
}
