'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  FileText,
  Users,
  Receipt,
  BarChart3,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const nav = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Orders',    href: '/admin/orders',    icon: FileText },
  { label: 'Customers', href: '/admin/customers', icon: Users },
  { label: 'Invoices',  href: '/admin/invoices',  icon: Receipt },
  { label: 'Reports',   href: '/admin/reports',   icon: BarChart3 },
]

export function MobileSidebarNav() {
  const pathname = usePathname()

  return (
    <nav className="p-3">
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
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
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
  )
}
