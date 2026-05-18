import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/assertAdmin'
import { getInvoiceSettings } from '@/lib/repositories/invoice-settings.repo'
import { InvoiceSettingsForm } from '@/components/admin/settings/InvoiceSettingsForm'

export const metadata = { title: 'Settings — OSW Permits Admin' }

export default async function SettingsPage() {
  const supabase = await createClient()
  await requireAdmin(supabase)
  const settings = await getInvoiceSettings(supabase)

  return (
    <div className="max-w-4xl space-y-5">
      <div className="admin-page-header">
        <div>
          <p className="admin-section-label">Settings</p>
          <h1 className="admin-page-title">Invoice configuration</h1>
          <p className="admin-page-meta">
            Sender identity, branding, and invoice numbering for the implemented billing flow.
          </p>
        </div>
      </div>
      <div className="admin-panel p-5">
        <p className="admin-section-label">Billing profile</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Control invoice branding, sender details, and invoice numbering.
        </p>
      </div>
      <div className="admin-panel p-5">
        <InvoiceSettingsForm settings={settings} />
      </div>
    </div>
  )
}
