'use client'
import { X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface PermitRow {
  jurisdiction: string
  cost?: number
}

interface PermitRowsEditorProps {
  rows: PermitRow[]
  onChange: (rows: PermitRow[]) => void
  error?: string
}

export function PermitRowsEditor({ rows, onChange, error }: PermitRowsEditorProps) {
  function updateCost(index: number, value: string) {
    const num = parseFloat(value)
    onChange(
      rows.map((r, i) =>
        i === index ? { ...r, cost: isNaN(num) ? undefined : num } : r
      )
    )
  }

  function removeRow(index: number) {
    onChange(rows.filter((_, i) => i !== index))
  }

  if (!rows.length) {
    return (
      <p className={cn('text-sm text-muted-foreground', error && 'text-destructive')}>
        {error ?? 'Select states above to add permit rows.'}
      </p>
    )
  }

  return (
    <div className="space-y-1">
      <div className="grid grid-cols-[60px_1fr_32px] gap-2 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <span>State</span>
        <span>Cost ($)</span>
        <span />
      </div>
      {rows.map((row, i) => (
        <div key={row.jurisdiction} className="grid grid-cols-[60px_1fr_32px] items-center gap-2">
          <span className="inline-flex items-center justify-center rounded-md bg-slate-100 px-2 py-1 font-mono text-xs font-semibold text-slate-700">
            {row.jurisdiction}
          </span>
          <Input
            type="number"
            min={0}
            step={0.01}
            placeholder="0.00"
            className="h-8 text-sm"
            value={row.cost ?? ''}
            onChange={(e) => updateCost(i, e.target.value)}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={() => removeRow(i)}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
