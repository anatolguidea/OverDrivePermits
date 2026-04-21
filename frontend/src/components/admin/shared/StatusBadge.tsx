import { cn } from '@/lib/utils'
import type { OrderStatus, PermitStatus, InvoiceStatus } from '@/lib/supabase/types'

type AnyStatus = OrderStatus | PermitStatus | InvoiceStatus

const styles: Record<string, string> = {
  // Order
  draft:      'bg-slate-100 text-slate-600',
  active:     'bg-blue-100 text-blue-700',
  completed:  'bg-green-100 text-green-700',
  cancelled:  'bg-red-100 text-red-600',
  // Permit
  pending:    'bg-slate-100 text-slate-500',
  submitted:  'bg-yellow-100 text-yellow-700',
  issued:     'bg-green-100 text-green-700',
  // Invoice
  sent:       'bg-blue-100 text-blue-700',
  paid:       'bg-emerald-100 text-emerald-700',
}

const labels: Record<string, string> = {
  draft: 'Draft', active: 'Active', completed: 'Completed', cancelled: 'Cancelled',
  pending: 'Pending', submitted: 'Submitted', issued: 'Issued',
  sent: 'Sent', paid: 'Paid',
}

interface StatusBadgeProps {
  status: AnyStatus
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        styles[status] ?? 'bg-slate-100 text-slate-600',
        className
      )}
    >
      {labels[status] ?? status}
    </span>
  )
}
