'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  FileText,
  Users,
  Receipt,
  Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const nav = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Orders',    href: '/admin/orders',    icon: FileText },
  { label: 'Customers', href: '/admin/customers', icon: Users },
  { label: 'Invoices',  href: '/admin/invoices',  icon: Receipt },
  { label: 'Settings',  href: '/admin/settings',  icon: Settings },
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
                data-active={active}
                className={cn(
                  'admin-nav-link',
                  active
                    ? 'border-slate-300 bg-white text-slate-950'
                    : 'text-slate-600 hover:border-slate-200 hover:bg-white hover:text-slate-950'
                )}
              >
                <Icon className={cn('relative z-[1] h-4 w-4 shrink-0', active ? 'text-slate-950' : 'text-slate-500')} />
                <span className="relative z-[1]">{label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
