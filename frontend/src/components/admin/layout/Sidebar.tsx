'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  FileText,
  Users,
  Receipt,
  Truck,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const nav = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Orders',    href: '/admin/orders',    icon: FileText },
  { label: 'Customers', href: '/admin/customers', icon: Users },
  { label: 'Invoices',  href: '/admin/invoices',  icon: Receipt },
  { label: 'Settings',  href: '/admin/settings',  icon: Settings },
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
        'hidden border-r border-slate-200/80 lg:flex lg:flex-col',
        collapsed ? 'lg:w-[5.5rem]' : 'lg:w-[15.5rem]'
      )}
    >
      <div
        className={cn(
          'flex h-full flex-col overflow-hidden bg-[rgba(248,250,252,0.88)]',
          collapsed ? 'px-2 py-4' : 'px-3 py-4'
        )}
      >
        <div
          className={cn(
            'flex items-center rounded-lg border border-slate-200 bg-white px-3 py-3',
            collapsed ? 'justify-center' : 'gap-3'
          )}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-950 text-white">
            <Truck className="h-5 w-5 shrink-0" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Admin Desk
              </p>
              <p className="truncate text-sm font-semibold tracking-tight text-slate-950">
                OSW Permits
              </p>
            </div>
          )}
        </div>

        {!collapsed && (
          <div className="mt-4 rounded-lg border border-slate-200 bg-white px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Workspace
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-950">
              Dense operator layout
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Orders, customers, invoices, and settings only. No extra dashboard chrome.
            </p>
          </div>
        )}

        <nav className="mt-5 flex-1 overflow-y-auto">
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
                    data-active={active}
                    className={cn(
                      'admin-nav-link',
                      collapsed && 'justify-center px-2.5',
                      active
                        ? 'border-slate-300 bg-white text-slate-950'
                        : 'text-slate-600 hover:border-slate-200 hover:bg-white hover:text-slate-950'
                    )}
                  >
                    <Icon className={cn('relative z-[1] h-4 w-4 shrink-0', active ? 'text-slate-950' : 'text-slate-500')} />
                    {!collapsed && <span className="relative z-[1]">{label}</span>}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="mt-4 border-t border-slate-900/10 pt-4">
          <button
            onClick={onToggle}
            className={cn(
              'flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs font-medium text-slate-600 transition hover:text-slate-950',
              collapsed && 'justify-center px-2'
            )}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4" />
                <span>Collapse rail</span>
              </>
            )}
          </button>
        </div>
      </div>
    </aside>
  )
}
