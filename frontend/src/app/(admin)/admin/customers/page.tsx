import Link from 'next/link'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { findCustomers } from '@/lib/repositories/customers.repo'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { EmptyState } from '@/components/admin/shared/EmptyState'
import { CustomersSearchBar } from '@/components/admin/customers/CustomersSearchBar'

export const metadata = { title: 'Customers — OSW Permits Admin' }
export const dynamic = 'force-dynamic'

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: { search?: string; page?: string }
}) {
  const supabase = await createClient()
  const { data: customers, total } = await findCustomers(supabase, {
    search: searchParams.search,
    page: searchParams.page ? Number(searchParams.page) : 1,
  })

  return (
    <div className="space-y-5">
      <div className="admin-page-header">
        <div>
          <p className="admin-section-label">Customers</p>
          <h1 className="admin-page-title">Carrier directory</h1>
          <p className="admin-page-meta">{total} carriers on file with fleet, credentials, and order history.</p>
        </div>
        <Button asChild size="sm">
          <Link href="/admin/customers/new">
            <Plus className="mr-1.5 h-4 w-4" /> New Customer
          </Link>
        </Button>
      </div>

      <CustomersSearchBar defaultValue={searchParams.search ?? ''} />

      {customers.length === 0 ? (
        <EmptyState
          title="No customers found"
          description={searchParams.search ? 'Try a different search.' : 'Add your first customer to get started.'}
          action={
            <Button asChild size="sm">
              <Link href="/admin/customers/new"><Plus className="mr-1.5 h-3.5 w-3.5" />New Customer</Link>
            </Button>
          }
        />
      ) : (
        <div className="admin-table-wrap">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50">
                <TableHead className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Company</TableHead>
                <TableHead className="w-28 text-[11px] uppercase tracking-[0.14em] text-slate-500">USDOT</TableHead>
                <TableHead className="w-28 text-[11px] uppercase tracking-[0.14em] text-slate-500">MC #</TableHead>
                <TableHead className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Contact</TableHead>
                <TableHead className="w-24 text-[11px] uppercase tracking-[0.14em] text-slate-500">Location</TableHead>
                <TableHead className="w-20 text-right text-[11px] uppercase tracking-[0.14em] text-slate-500">Orders</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((c) => (
                <TableRow key={c.id} className="hover:bg-slate-50/70">
                  <TableCell>
                    <Link
                      href={`/admin/customers/${c.id}`}
                      className="font-medium text-slate-950 hover:underline"
                    >
                      {c.name}
                    </Link>
                  </TableCell>
                  <TableCell className="admin-mono text-xs">{c.usdot ?? '—'}</TableCell>
                  <TableCell className="admin-mono text-xs">{c.mc_number ?? '—'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {c.email ?? c.phone ?? '—'}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {[c.city, c.state_code].filter(Boolean).join(', ') || '—'}
                  </TableCell>
                  <TableCell className="text-right admin-mono font-medium">{c._order_count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
