'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { LogOut, User, Menu, ChevronRight, CalendarDays, Search } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { csrfFetch } from '@/lib/http/client'
import { useToast } from '@/hooks/use-toast'
import { MobileSidebarNav } from './MobileSidebarNav'

const SEGMENT_LABELS: Record<string, string> = {
  admin:     'Admin',
  dashboard: 'Dashboard',
  orders:    'Orders',
  customers: 'Customers',
  invoices:  'Invoices',
  settings:  'Settings',
  new:       'New',
  edit:      'Edit',
}

function useBreadcrumbs() {
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)
  return segments
    .map((seg, i) => ({
      label: SEGMENT_LABELS[seg] ?? seg,
      href: '/' + segments.slice(0, i + 1).join('/'),
      isLast: i === segments.length - 1,
    }))
    .filter((b) => b.label !== 'Admin')
}

interface TopBarProps {
  userEmail: string | undefined
  onMenuClick?: () => void
  onCommandOpen?: () => void
}

export function TopBar({ userEmail, onMenuClick, onCommandOpen }: TopBarProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [signingOut, setSigningOut] = useState(false)
  const breadcrumbs = useBreadcrumbs()
  const today = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date())

  async function handleSignOut() {
    if (signingOut) return

    setSigningOut(true)
    try {
      const response = await csrfFetch('/api/auth/logout', { method: 'POST' })
      if (!response.ok) {
        const json = await response.json().catch(() => null)
        throw new Error(String(json?.error ?? 'Sign-out failed'))
      }

      router.push('/login')
      router.refresh()
    } catch (error) {
      toast({
        title: 'Sign-out failed',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <header className="admin-topbar mx-auto flex h-auto w-full max-w-[1520px] items-center justify-between px-3 py-3 sm:px-4 lg:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden h-8 w-8">
              <Menu className="h-4 w-4" />
              <span className="sr-only">Open menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SheetHeader className="border-b border-border px-5 py-4">
              <SheetTitle className="text-sm font-bold">OSW Permits</SheetTitle>
            </SheetHeader>
            <MobileSidebarNav />
          </SheetContent>
        </Sheet>

        <div className="min-w-0">
          <div className="hidden sm:inline-flex admin-kicker">Permit operations workspace</div>
          <nav aria-label="Breadcrumb" className="mt-1">
            <ol className="flex flex-wrap items-center gap-1 text-sm">
              {breadcrumbs.map((crumb, i) => (
                <li key={crumb.href} className="flex items-center gap-1">
                  {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground/60" />}
                  {crumb.isLast ? (
                    <span className="font-medium text-foreground">{crumb.label}</span>
                  ) : (
                    <Link
                      href={crumb.href}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {crumb.label}
                    </Link>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={onCommandOpen}
          className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500 transition hover:bg-white sm:flex"
          title="Command palette (⌘K)"
        >
          <Search className="h-3.5 w-3.5" />
          <span>Search…</span>
          <kbd className="rounded border border-slate-200 bg-white px-1 font-mono text-[0.65rem] text-slate-500">⌘K</kbd>
        </button>

        <div className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 sm:flex">
          <CalendarDays className="h-3.5 w-3.5 text-slate-500" />
          <span className="font-medium">{today}</span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-auto gap-3 rounded-lg border border-slate-200 bg-white px-2.5 py-2 transition hover:bg-slate-50 sm:px-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-950 text-white text-xs font-semibold">
                {userEmail?.[0]?.toUpperCase() ?? <User className="h-3.5 w-3.5" />}
              </div>
              <div className="hidden min-w-0 text-left sm:block">
                <p className="max-w-44 truncate text-sm font-medium text-slate-900">{userEmail}</p>
                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Admin</p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 rounded-lg border-slate-200 bg-white">
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer rounded-xl text-destructive focus:text-destructive"
              disabled={signingOut}
              onClick={handleSignOut}
            >
              <LogOut className="mr-2 h-4 w-4" />
              {signingOut ? 'Signing out...' : 'Sign out'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
