import { cn } from '@/lib/utils'
import type { OrderStatus, PermitStatus, InvoiceStatus } from '@/lib/supabase/types'

type AnyStatus = OrderStatus | PermitStatus | InvoiceStatus

const styles: Record<string, string> = {
  // Order
  draft:      'border border-slate-200 bg-slate-100 text-slate-700',
  active:     'border border-blue-200 bg-blue-50 text-blue-700',
  completed:  'border border-emerald-200 bg-emerald-50 text-emerald-700',
  cancelled:  'border border-rose-200 bg-rose-50 text-rose-700',
  // Permit
  pending:    'border border-slate-200 bg-slate-100 text-slate-600',
  in_progress:'border border-amber-200 bg-amber-50 text-amber-700',
  submitted:  'border border-blue-200 bg-blue-50 text-blue-700',
  issued:     'border border-emerald-200 bg-emerald-50 text-emerald-700',
  rejected:   'border border-rose-200 bg-rose-50 text-rose-700',
  not_needed: 'border border-slate-200 bg-slate-50 text-slate-500 line-through',
  // Invoice
  sent:       'border border-blue-200 bg-blue-50 text-blue-700',
  overdue:    'border border-amber-200 bg-amber-50 text-amber-700',
  paid:       'border border-emerald-200 bg-emerald-50 text-emerald-700',
  void:       'border border-rose-200 bg-rose-50 text-rose-700',
}

const labels: Record<string, string> = {
  draft: 'Draft', active: 'Active', completed: 'Completed', cancelled: 'Cancelled',
  pending: 'Pending', in_progress: 'In Progress', submitted: 'Submitted', issued: 'Issued', rejected: 'Rejected', not_needed: 'Not Needed',
  sent: 'Sent', overdue: 'Overdue', paid: 'Paid', void: 'Void',
}

interface StatusBadgeProps {
  status: AnyStatus
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
        styles[status] ?? 'bg-slate-100 text-slate-600',
        className
      )}
    >
      {labels[status] ?? status}
    </span>
  )
}
