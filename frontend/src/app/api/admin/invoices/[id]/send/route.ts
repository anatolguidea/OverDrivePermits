import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/assertAdmin'
import { conflict } from '@/lib/errors'
import { getResendClient } from '@/lib/email/resend'
import { ensureInvoiceExists, updateInvoice } from '@/lib/repositories/invoices.repo'
import { ensureCustomerExists } from '@/lib/repositories/customers.repo'
import { getInvoiceSettings } from '@/lib/repositories/invoice-settings.repo'
import { logAdminAction } from '@/lib/repositories/admin-audit.repo'
import { renderInvoicePdf } from '@/lib/invoices/pdf'
import { apiSuccess, handleApiError, parseWithSchema } from '@/lib/http/admin'
import { uuidParamSchema } from '@/lib/validators/admin-api.schema'

export const runtime = 'nodejs'

type RouteContext = { params: { id: string } }

const formatMoney = (amount: number) =>
  amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })

export async function POST(_request: NextRequest, { params }: RouteContext) {
  const supabase = await createClient()
  try {
    const { user, role } = await requireAdmin(supabase, ['owner', 'admin'])
    const id = parseWithSchema(uuidParamSchema, params.id)
    const invoice = await ensureInvoiceExists(supabase, id)
    const customer = await ensureCustomerExists(supabase, invoice.customer_id)
    const settings = await getInvoiceSettings(supabase)

    const to = customer.billing_email ?? customer.email
    if (!to) {
      throw conflict('Customer does not have a billing email configured')
    }
    if (invoice.status === 'void') {
      throw conflict('Cannot send a void invoice')
    }

    const senderEmail = settings.sender_email ?? process.env.RESEND_FROM_EMAIL
    if (!senderEmail) {
      throw conflict('Sender email is not configured in invoice settings or RESEND_FROM_EMAIL')
    }
    const senderName = settings.sender_name || settings.company_name
    const from = `${senderName} <${senderEmail}>`

    const pdf = await renderInvoicePdf({ invoice, customer, settings })

    const resend = getResendClient()
    const { error } = await resend.emails.send({
      from,
      to: [to],
      subject: `Invoice ${invoice.invoice_number} from ${settings.company_name}`,
      html: `
        <p>Hello${customer.contact_name ? ` ${customer.contact_name}` : ''},</p>
        <p>Please find attached invoice <strong>${invoice.invoice_number}</strong> for ${formatMoney(invoice.total_amount)}.</p>
        <p>Thank you,<br/>${settings.company_name}</p>
      `,
      attachments: [
        {
          filename: `${invoice.invoice_number}.pdf`,
          content: pdf,
        },
      ],
    })

    if (error) throw new Error(`resend.sendInvoice: ${error.message}`)

    const updated =
      invoice.status === 'draft'
        ? await updateInvoice(supabase, id, { status: 'sent' })
        : invoice

    await logAdminAction(supabase, {
      actor_user_id: user.id,
      actor_role: role,
      action: 'invoice.send',
      target_table: 'invoices',
      target_id: id,
      metadata: {
        invoice_number: invoice.invoice_number,
        customer_id: invoice.customer_id,
        sent_to: to,
      },
    })

    return apiSuccess({
      invoice: updated,
      sent_to: to,
    })
  } catch (err) {
    return handleApiError(err)
  }
}
