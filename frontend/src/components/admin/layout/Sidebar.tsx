'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  FileText,
  Users,
  Receipt,
  BarChart3,
  Truck,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const nav = [
  { label: 'Dashboard',  href: '/admin/dashboard',  icon: LayoutDashboard },
  { label: 'Orders',     href: '/admin/orders',      icon: FileText },
  { label: 'Customers',  href: '/admin/customers',   icon: Users },
  { label: 'Invoices',   href: '/admin/invoices',    icon: Receipt },
  { label: 'Reports',    href: '/admin/reports',     icon: BarChart3 },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-border bg-card">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-border px-5">
        <Truck className="h-6 w-6 text-primary" />
        <span className="text-sm font-bold tracking-tight">OSW Permits</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
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
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    active
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Version */}
      <div className="border-t border-border px-5 py-3">
        <p className="text-xs text-muted-foreground">Admin v1.0</p>
      </div>
    </aside>
  )
}
