import { CustomerForm } from '@/components/admin/customers/CustomerForm'

export const metadata = { title: 'New Customer — OSW Permits Admin' }

export default function NewCustomerPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">New Customer</h2>
        <p className="text-sm text-muted-foreground">Add a new trucking company</p>
      </div>
      <CustomerForm />
    </div>
  )
}
