import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/assertAdmin'
import { apiSuccess, handleApiError } from '@/lib/http/admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()

  try {
    await requireAdmin(supabase)

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const [
      activeOrdersRes,
      awaitingPendingRes,
      awaitingInProgressRes,
      issuedTodayRes,
      overdueInvoicesRes,
    ] = await Promise.all([
      supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'active').is('deleted_at', null),
      supabase.from('permits').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('permits').select('*', { count: 'exact', head: true }).eq('status', 'in_progress'),
      supabase.from('permits').select('*', { count: 'exact', head: true })
        .eq('status', 'issued')
        .gte('updated_at', todayStart.toISOString()),
      supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('status', 'overdue'),
    ])

    return apiSuccess(
      {
        activeOrders: activeOrdersRes.count ?? 0,
        awaitingSubmission: (awaitingPendingRes.count ?? 0) + (awaitingInProgressRes.count ?? 0),
        issuedToday: issuedTodayRes.count ?? 0,
        overdueInvoices: overdueInvoicesRes.count ?? 0,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (err) {
    return handleApiError(err)
  }
}

