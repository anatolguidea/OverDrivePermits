import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { findCustomerById } from '@/lib/repositories/customers.repo'
import { CustomerForm } from '@/components/admin/customers/CustomerForm'

export const metadata = { title: 'Edit Customer — OSW Permits Admin' }

export default async function EditCustomerPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const customer = await findCustomerById(supabase, params.id)
  if (!customer) notFound()

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Edit Customer</h2>
        <p className="text-sm text-muted-foreground">{customer.name}</p>
      </div>
      <CustomerForm customer={customer} />
    </div>
  )
}
