import '@/styles/admin.css'
import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminShell } from '@/components/admin/layout/AdminShell'
import { Providers } from '@/components/admin/layout/Providers'
import { getAdminContext } from '@/lib/auth/assertAdmin'

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const context = await getAdminContext(supabase)
  if (!context || context.role !== 'admin') {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    redirect(user ? '/' : '/login')
  }

  return (
    <Providers>
      <AdminShell userEmail={context.user.email}>
        {children}
      </AdminShell>
    </Providers>
  )
}
