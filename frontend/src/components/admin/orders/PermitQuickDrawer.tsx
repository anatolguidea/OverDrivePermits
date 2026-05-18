'use client'
import { useState, useRef, useEffect } from 'react'
import { csrfFetch } from '@/lib/http/client'
import { Upload, FileText, ExternalLink, ChevronDown, X } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StatusBadge } from '@/components/admin/shared/StatusBadge'
import { useToast } from '@/hooks/use-toast'
import type { PermitStatus } from '@/lib/supabase/types'
import type { PermitChip } from './PermitProgressChips'

const TRANSITIONS: Record<PermitStatus, { label: string; to: PermitStatus }[]> = {
  pending:     [{ label: 'Mark In Progress', to: 'in_progress' }, { label: 'Mark Not Needed', to: 'not_needed' }],
  in_progress: [{ label: 'Mark Submitted',   to: 'submitted'   }, { label: 'Mark Rejected',   to: 'rejected'   }, { label: 'Revert Pending', to: 'pending' }],
  submitted:   [{ label: 'Mark Issued',      to: 'issued'      }, { label: 'Mark Rejected',   to: 'rejected'   }, { label: 'Revert Pending', to: 'pending' }],
  issued:      [{ label: 'Revert Submitted', to: 'submitted'   }],
  rejected:    [{ label: 'Mark In Progress', to: 'in_progress' }, { label: 'Revert Pending',  to: 'pending'    }],
  not_needed:  [{ label: 'Revert Pending',   to: 'pending'     }],
}

interface PermitQuickDrawerProps {
  permit: PermitChip | null
  orderNumber: string
  onClose: () => void
  onUpdated: (permitId: string, patch: Partial<PermitChip>) => void
}

export function PermitQuickDrawer({ permit, orderNumber, onClose, onUpdated }: PermitQuickDrawerProps) {
  const { toast } = useToast()
  const [transitioning, setTransitioning] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [signedUrl, setSignedUrl] = useState<string | null>(null)
  const [permitNumberDraft, setPermitNumberDraft] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!permit) { setSignedUrl(null); return }
    setPermitNumberDraft(permit.permit_number ?? '')
    if (permit.document_url) {
      fetch(`/api/admin/permits/${permit.id}/signed-url`)
        .then((r) => r.ok ? r.json() : null)
        .then((j) => setSignedUrl(j?.signedUrl ?? null))
        .catch(() => null)
    } else {
      setSignedUrl(null)
    }
  }, [permit])

  async function handleTransition(to: PermitStatus) {
    if (!permit) return
    setTransitioning(true)
    try {
      const res = await csrfFetch(`/api/admin/permits/${permit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: to }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      onUpdated(permit.id, { status: to })
      toast({ title: `${permit.jurisdiction} → ${to.replace('_', ' ')}` })
    } catch (err) {
      toast({ title: 'Error', description: String(err), variant: 'destructive' })
    } finally {
      setTransitioning(false)
    }
  }

  async function handleSaveNumber() {
    if (!permit || permitNumberDraft === (permit.permit_number ?? '')) return
    try {
      const res = await csrfFetch(`/api/admin/permits/${permit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permit_number: permitNumberDraft }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      onUpdated(permit.id, { permit_number: permitNumberDraft || null })
      toast({ title: 'Permit number saved' })
    } catch (err) {
      toast({ title: 'Error', description: String(err), variant: 'destructive' })
    }
  }

  async function handleUpload(file: File) {
    if (!permit) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await csrfFetch(`/api/admin/permits/${permit.id}/upload`, { method: 'POST', body: fd })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)

      const urlRes = await fetch(`/api/admin/permits/${permit.id}/signed-url`)
      const urlJson = urlRes.ok ? await urlRes.json() : null
      const newUrl = urlJson?.signedUrl ?? null
      setSignedUrl(newUrl)
      onUpdated(permit.id, { document_url: json.data.document_url })
      toast({ title: `Document uploaded for ${permit.jurisdiction}` })
    } catch (err) {
      toast({ title: 'Upload failed', description: String(err), variant: 'destructive' })
    } finally {
      setUploading(false)
    }
  }

  const transitionOptions = permit ? TRANSITIONS[permit.status] ?? [] : []

  return (
    <Sheet open={!!permit} onOpenChange={(open) => { if (!open) onClose() }}>
      <SheetContent className="w-full sm:max-w-sm" side="right">
        {permit && (
          <>
            <SheetHeader className="pb-4">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 admin-mono text-base font-bold text-slate-700">
                  {permit.jurisdiction}
                </span>
                <div>
                  <SheetTitle className="text-sm font-semibold leading-none">
                    {orderNumber}
                  </SheetTitle>
                  <div className="mt-1.5">
                    <StatusBadge status={permit.status} />
                  </div>
                </div>
              </div>
            </SheetHeader>

            <div className="space-y-5">
              {/* Permit number */}
              <div>
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">Permit #</p>
                <div className="flex gap-2">
                  <Input
                    className="h-8 font-mono text-sm"
                    placeholder="Enter permit number…"
                    value={permitNumberDraft}
                    onChange={(e) => setPermitNumberDraft(e.target.value)}
                    onBlur={handleSaveNumber}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveNumber() }}
                  />
                </div>
              </div>

              {/* Cost */}
              {permit.cost != null && (
                <div>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">State Fee</p>
                  <p className="font-mono text-sm">
                    ${permit.cost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              )}

              {/* Document */}
              <div>
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">Document</p>
                {signedUrl ? (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="gap-1.5" asChild>
                      <a href={signedUrl} target="_blank" rel="noopener noreferrer">
                        <FileText className="h-3.5 w-3.5" />
                        View PDF
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1.5 text-muted-foreground"
                      disabled={uploading}
                      onClick={() => fileRef.current?.click()}
                    >
                      <Upload className="h-3.5 w-3.5" />
                      Replace
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    disabled={uploading}
                    onClick={() => fileRef.current?.click()}
                  >
                    <Upload className="h-3.5 w-3.5" />
                    {uploading ? 'Uploading…' : 'Upload Document'}
                  </Button>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleUpload(file)
                    e.target.value = ''
                  }}
                />
              </div>

              {/* Status transitions */}
              {transitionOptions.length > 0 && (
                <div>
                  <p className="mb-1.5 text-xs font-medium text-muted-foreground">Change Status</p>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-1.5" disabled={transitioning}>
                        {transitioning ? 'Updating…' : 'Actions'}
                        <ChevronDown className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      {transitionOptions.flatMap(({ label, to }, i) => {
                        const item = (
                          <DropdownMenuItem key={to} onSelect={() => handleTransition(to)}>
                            {label}
                          </DropdownMenuItem>
                        )
                        return i > 0 && to === 'pending'
                          ? [<DropdownMenuSeparator key={`sep-${i}`} />, item]
                          : [item]
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
