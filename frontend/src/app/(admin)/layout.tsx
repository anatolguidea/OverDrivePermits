import '@/styles/admin.css'
import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminShell } from '@/components/admin/layout/AdminShell'
import { Providers } from '@/components/admin/layout/Providers'

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: adminRow } = await supabase
    .from('admins')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!adminRow) redirect('/')

  return (
    <Providers>
      <AdminShell userEmail={user.email}>
        {children}
      </AdminShell>
    </Providers>
  )
}
