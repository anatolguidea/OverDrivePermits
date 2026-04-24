'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard,
  FileText,
  Users,
  Receipt,
  BarChart3,
  Truck,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const nav = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Orders',    href: '/admin/orders',    icon: FileText },
  { label: 'Customers', href: '/admin/customers', icon: Users },
  { label: 'Invoices',  href: '/admin/invoices',  icon: Receipt },
  { label: 'Reports',   href: '/admin/reports',   icon: BarChart3 },
]

interface SidebarProps {
  collapsed?: boolean
  onToggle?: () => void
}

export function Sidebar({ collapsed = false, onToggle }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col border-r border-border bg-card transition-all duration-200',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className={cn(
        'flex h-14 items-center border-b border-border',
        collapsed ? 'justify-center px-2' : 'gap-2 px-5'
      )}>
        <Truck className="h-5 w-5 shrink-0 text-primary" />
        {!collapsed && (
          <span className="text-sm font-bold tracking-tight">OSW Permits</span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <ul className="space-y-1">
          {nav.map(({ label, href, icon: Icon }) => {
            const active =
              href === '/admin/dashboard'
                ? pathname === href
                : pathname.startsWith(href)

            return (
              <li key={href}>
                <Link
                  href={href}
                  title={collapsed ? label : undefined}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    collapsed && 'justify-center px-2',
                    active
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!collapsed && label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-border p-2">
        <button
          onClick={onToggle}
          className={cn(
            'flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors',
            collapsed && 'justify-center px-2'
          )}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}
