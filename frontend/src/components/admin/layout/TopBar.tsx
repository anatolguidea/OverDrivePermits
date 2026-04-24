'use client'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { LogOut, User, Menu, ChevronRight } from 'lucide-react'
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
import { getSupabaseBrowser } from '@/lib/supabase/browser'
import { MobileSidebarNav } from './MobileSidebarNav'

const SEGMENT_LABELS: Record<string, string> = {
  admin:     'Admin',
  dashboard: 'Dashboard',
  orders:    'Orders',
  customers: 'Customers',
  invoices:  'Invoices',
  reports:   'Reports',
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
}

export function TopBar({ userEmail, onMenuClick }: TopBarProps) {
  const router = useRouter()
  const supabase = getSupabaseBrowser()
  const breadcrumbs = useBreadcrumbs()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4 lg:px-6">
      {/* Left: hamburger (mobile) + breadcrumbs */}
      <div className="flex items-center gap-3">
        {/* Mobile hamburger */}
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

        {/* Breadcrumbs */}
        <nav aria-label="Breadcrumb">
          <ol className="flex items-center gap-1 text-sm">
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

      {/* Right: user menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
              {userEmail?.[0]?.toUpperCase() ?? <User className="h-3.5 w-3.5" />}
            </div>
            <span className="hidden text-sm sm:inline max-w-40 truncate">{userEmail}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer text-destructive focus:text-destructive"
            onClick={handleSignOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
