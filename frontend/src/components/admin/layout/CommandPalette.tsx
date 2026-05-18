'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, Users, Plus, LayoutDashboard, Receipt, Search, Settings } from 'lucide-react'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { useCustomerOptions } from '@/lib/queries/useCustomers'
import { useOrders } from '@/lib/queries/useOrders'

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')

  const queryEnabled = open && search.trim().length >= 2
  const { data: customers = [] } = useCustomerOptions(search || undefined, { enabled: queryEnabled })
  const { data: ordersPage } = useOrders(
    { search: search || undefined, page_size: 6 },
    { enabled: queryEnabled }
  )
  const orders = ordersPage?.data ?? []

  const go = useCallback(
    (href: string) => {
      onOpenChange(false)
      router.push(href)
    },
    [router, onOpenChange]
  )

  useEffect(() => {
    if (!open) setSearch('')
  }, [open])

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search orders, customers, or jump to…"
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>
          <div className="flex flex-col items-center gap-1 py-4 text-muted-foreground">
            <Search className="h-5 w-5" />
            <p className="text-sm">No results for &ldquo;{search}&rdquo;</p>
          </div>
        </CommandEmpty>

        {/* Quick actions */}
        <CommandGroup heading="Quick Actions">
          <CommandItem onSelect={() => go('/admin/orders/new')}>
            <Plus className="mr-2 h-4 w-4" />
            New Order
            <kbd className="ml-auto font-mono text-xs text-muted-foreground">N</kbd>
          </CommandItem>
          <CommandItem onSelect={() => go('/admin/customers/new')}>
            <Plus className="mr-2 h-4 w-4" />
            New Customer
          </CommandItem>
          <CommandItem onSelect={() => go('/admin/dashboard')}>
            <LayoutDashboard className="mr-2 h-4 w-4" />
            Dashboard
          </CommandItem>
          <CommandItem onSelect={() => go('/admin/invoices')}>
            <Receipt className="mr-2 h-4 w-4" />
            Invoices
          </CommandItem>
          <CommandItem onSelect={() => go('/admin/settings')}>
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </CommandItem>
        </CommandGroup>

        {orders.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Orders">
              {orders.map((order) => (
                <CommandItem key={order.id} onSelect={() => go(`/admin/orders/${order.id}`)}>
                  <FileText className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="font-mono text-xs text-muted-foreground mr-2">
                    {order.order_number}
                  </span>
                  <span className="truncate">{order.customers.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {customers.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Customers">
              {customers.slice(0, 6).map((c) => (
                <CommandItem key={c.id} onSelect={() => go(`/admin/customers/${c.id}`)}>
                  <Users className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{c.name}</span>
                  {c.usdot && (
                    <span className="ml-auto text-xs text-muted-foreground">{c.usdot}</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  )
}
