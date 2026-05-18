'use client'
import { useState } from 'react'
import { csrfFetch } from '@/lib/http/client'
import { useRouter } from 'next/navigation'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/admin/shared/StatusBadge'
import { useToast } from '@/hooks/use-toast'
import { ChevronDown } from 'lucide-react'
import type { OrderStatus } from '@/lib/supabase/types'

const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  draft:     ['active', 'cancelled'],
  active:    ['completed', 'cancelled'],
  completed: [],
  cancelled: ['draft'],
}

interface OrderStatusControlProps {
  orderId: string
  currentStatus: OrderStatus
}

export function OrderStatusControl({ orderId, currentStatus }: OrderStatusControlProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const options = TRANSITIONS[currentStatus] ?? []

  if (!options.length) {
    return <StatusBadge status={currentStatus} />
  }

  async function transition(to: OrderStatus) {
    setLoading(true)
    try {
      const res = await csrfFetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: to }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      toast({ title: `Order marked ${to}` })
      router.refresh()
    } catch (err) {
      toast({ title: 'Error', description: String(err), variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1" disabled={loading}>
          <StatusBadge status={currentStatus} />
          <ChevronDown className="h-3 w-3 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <div className="px-2 py-1.5 text-xs text-muted-foreground">Change status</div>
        <DropdownMenuSeparator />
        {options.map((status) => (
          <DropdownMenuItem key={status} onSelect={() => transition(status)} className="capitalize">
            Mark {status}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
