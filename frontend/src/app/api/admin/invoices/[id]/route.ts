import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { findInvoiceById, updateInvoice, deleteInvoice, ensureInvoiceExists } from '@/lib/repositories/invoices.repo'
import { logAdminAction } from '@/lib/repositories/admin-audit.repo'
import { updateInvoiceSchema } from '@/lib/validators/invoice.schema'
import { requireAdmin } from '@/lib/auth/assertAdmin'
import { apiNoContent, apiSuccess, handleApiError, parseWithSchema } from '@/lib/http/admin'
import { uuidParamSchema } from '@/lib/validators/admin-api.schema'

type RouteContext = { params: { id: string } }

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const supabase = await createClient()
  try {
    await requireAdmin(supabase)
    const id = parseWithSchema(uuidParamSchema, params.id)
    const data = await ensureInvoiceExists(supabase, id)
    return apiSuccess(data)
  } catch (err) {
    return handleApiError(err)
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const supabase = await createClient()
  try {
    const { user, role } = await requireAdmin(supabase, ['owner', 'admin', 'dispatcher'])
    const id = parseWithSchema(uuidParamSchema, params.id)
    const current = await ensureInvoiceExists(supabase, id)
    const parsed = parseWithSchema(updateInvoiceSchema, await request.json())
    const data = await updateInvoice(supabase, id, parsed)

    if (parsed.status === 'void' && current.status !== 'void') {
      await logAdminAction(supabase, {
        actor_user_id: user.id,
        actor_role: role,
        action: 'invoice.void',
        target_table: 'invoices',
        target_id: id,
        metadata: {
          invoice_number: current.invoice_number,
          customer_id: current.customer_id,
          previous_status: current.status,
        },
      })
    }

    return apiSuccess(data)
  } catch (err) {
    return handleApiError(err)
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const supabase = await createClient()
  try {
    const { user, role } = await requireAdmin(supabase, ['owner', 'admin'])
    const id = parseWithSchema(uuidParamSchema, params.id)
    const invoice = await ensureInvoiceExists(supabase, id)
    await deleteInvoice(supabase, id)
    await logAdminAction(supabase, {
      actor_user_id: user.id,
      actor_role: role,
      action: 'invoice.delete',
      target_table: 'invoices',
      target_id: id,
      metadata: {
        invoice_number: invoice.invoice_number,
        customer_id: invoice.customer_id,
        status: invoice.status,
      },
    })
    return apiNoContent()
  } catch (err) {
    return handleApiError(err)
  }
}
