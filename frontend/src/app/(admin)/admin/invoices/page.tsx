import { Suspense } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { InvoicesTableWithFilters } from '@/components/admin/invoices/InvoicesTableWithFilters'

export const metadata = { title: 'Invoices — OSW Permits Admin' }

export default async function InvoicesPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Invoices</h2>
          <p className="text-sm text-muted-foreground">Manage all customer invoices</p>
        </div>
        <Button asChild size="sm">
          <Link href="/admin/invoices/new">
            <Plus className="mr-1.5 h-4 w-4" />
            New Invoice
          </Link>
        </Button>
      </div>

      <Suspense fallback={
        <div className="space-y-2 rounded-md border border-border p-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      }>
        <InvoicesTableWithFilters />
      </Suspense>
    </div>
  )
}
