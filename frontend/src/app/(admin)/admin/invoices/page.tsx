import { Suspense } from 'react'
import Link from 'next/link'
import { Plus, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { InvoicesTableWithFilters } from '@/components/admin/invoices/InvoicesTableWithFilters'

export const metadata = { title: 'Invoices — OSW Permits Admin' }

export default async function InvoicesPage() {
  return (
    <div className="space-y-5">
      <div className="admin-page-header">
        <div>
          <p className="admin-section-label">Invoices</p>
          <h1 className="admin-page-title">Billing ledger</h1>
          <p className="admin-page-meta">Issued, sent, overdue, paid, and void invoice states in one queue.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href="/admin/settings">
              <Settings className="mr-1.5 h-4 w-4" />
              Settings
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/admin/invoices/new">
              <Plus className="mr-1.5 h-4 w-4" />
              New Invoice
            </Link>
          </Button>
        </div>
      </div>

      <Suspense fallback={
        <div className="space-y-2 admin-table-wrap p-4">
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
