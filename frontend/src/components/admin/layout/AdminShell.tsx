'use client'
import { useState, useEffect, useCallback } from 'react'
import type { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { CommandPalette } from './CommandPalette'

interface AdminShellProps {
  userEmail: string | undefined
  children: ReactNode
}

export function AdminShell({ userEmail, children }: AdminShellProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)
  const router = useRouter()

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const inInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable

      // Cmd+K / Ctrl+K → command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCommandOpen((o) => !o)
        return
      }

      if (inInput) return

      // n → new order
      if (e.key === 'n' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        router.push('/admin/orders/new')
        return
      }

      // / → focus orders search
      if (e.key === '/') {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent('focus-orders-search'))
      }
    },
    [router]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return (
    <div className="admin-shell-bg flex min-h-screen bg-transparent">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <div className="flex min-w-0 flex-1 flex-col px-4 pb-4 pt-4 lg:px-6 lg:pb-6 lg:pt-5">
        <TopBar userEmail={userEmail} onCommandOpen={() => setCommandOpen(true)} />
        <main className="mt-5 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1520px] px-0 pb-6">
            {children}
          </div>
        </main>
      </div>
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
    </div>
  )
}
