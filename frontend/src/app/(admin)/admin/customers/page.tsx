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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Customers</h2>
          <p className="text-sm text-muted-foreground">{total} total</p>
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
        <div className="rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Company</TableHead>
                <TableHead className="w-28">USDOT</TableHead>
                <TableHead className="w-28">MC #</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead className="w-24">Location</TableHead>
                <TableHead className="w-20 text-right">Orders</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <Link
                      href={`/admin/customers/${c.id}`}
                      className="font-medium hover:underline"
                    >
                      {c.name}
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{c.usdot ?? '—'}</TableCell>
                  <TableCell className="font-mono text-sm">{c.mc_number ?? '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {c.email ?? c.phone ?? '—'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {[c.city, c.state_code].filter(Boolean).join(', ') || '—'}
                  </TableCell>
                  <TableCell className="text-right font-medium">{c._order_count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
