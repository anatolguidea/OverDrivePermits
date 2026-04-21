import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/server'
import { findInvoiceById } from '@/lib/repositories/invoices.repo'
import { InvoiceDetail } from '@/components/admin/invoices/InvoiceDetail'

interface InvoicePageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: InvoicePageProps) {
  const { id } = await params
  const supabase = await createClient()
  const invoice = await findInvoiceById(supabase, id)
  return { title: invoice ? `${invoice.invoice_number} — OSW Permits Admin` : 'Invoice Not Found' }
}

export default async function InvoicePage({ params }: InvoicePageProps) {
  const { id } = await params
  const supabase = await createClient()
  const invoice = await findInvoiceById(supabase, id)

  if (!invoice) notFound()

  return (
    <div className="max-w-3xl space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/admin/invoices">
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Invoices
        </Link>
      </Button>

      <InvoiceDetail invoice={invoice} />
    </div>
  )
}
