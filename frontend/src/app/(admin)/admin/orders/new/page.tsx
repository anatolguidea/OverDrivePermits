import { Suspense } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NewOrderWizard } from '@/components/admin/orders/NewOrderWizard'

export const metadata = { title: 'New Order — OSW Permits Admin' }

export default function NewOrderPage() {
  return (
    <div className="max-w-3xl space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/admin/orders">
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Orders
        </Link>
      </Button>

      <div>
        <h2 className="text-2xl font-bold tracking-tight">New Order</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Create an order and assign state permits in one step.
        </p>
      </div>

      <Suspense fallback={<div className="h-96 animate-pulse rounded-lg bg-muted" />}>
        <NewOrderWizard />
      </Suspense>
    </div>
  )
}
