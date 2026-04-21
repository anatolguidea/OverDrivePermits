'use client'
import { useState, useRef } from 'react'
import {
  Upload,
  FileText,
  ExternalLink,
  ChevronDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { StatusBadge } from '@/components/admin/shared/StatusBadge'
import { useToast } from '@/hooks/use-toast'
import type { PermitStatus } from '@/lib/supabase/types'

export interface PermitManagementRow {
  id: string
  state_code: string
  status: PermitStatus
  cost: number | null
  permit_number: string | null
  document_url: string | null
  submitted_at: string | null
  issue_date: string | null
}

interface PermitManagementProps {
  orderId: string
  initialPermits: PermitManagementRow[]
  documentSignedUrls: Record<string, string>
}

export function PermitManagement({ orderId, initialPermits, documentSignedUrls }: PermitManagementProps) {
  const { toast } = useToast()
  const [permits, setPermits] = useState(initialPermits)
  const [signedUrls, setSignedUrls] = useState(documentSignedUrls)

  function updateLocal(id: string, patch: Partial<PermitManagementRow>) {
    setPermits((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  }

  async function transitionStatus(permit: PermitManagementRow, to: PermitStatus) {
    try {
      const res = await fetch(`/api/admin/permits/${permit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: to }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      updateLocal(permit.id, json.data)
      toast({ title: `${permit.state_code} marked ${to}` })
    } catch (err) {
      toast({ title: 'Error', description: String(err), variant: 'destructive' })
    }
  }

  async function savePermitNumber(permit: PermitManagementRow, value: string) {
    try {
      const res = await fetch(`/api/admin/permits/${permit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permit_number: value }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      updateLocal(permit.id, { permit_number: value || null })
    } catch (err) {
      toast({ title: 'Error', description: String(err), variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-2">
      {permits.map((permit) => (
        <PermitRow
          key={permit.id}
          permit={permit}
          signedUrl={signedUrls[permit.id]}
          onTransition={transitionStatus}
          onSaveNumber={savePermitNumber}
          onUploaded={(updated, url) => {
            updateLocal(updated.id, updated)
            if (url) setSignedUrls((prev) => ({ ...prev, [updated.id]: url }))
          }}
        />
      ))}
    </div>
  )
}

// ─── Single permit row ───────────────────────────────────────────────────────

interface PermitRowProps {
  permit: PermitManagementRow
  signedUrl?: string
  onTransition: (permit: PermitManagementRow, to: PermitStatus) => Promise<void>
  onSaveNumber: (permit: PermitManagementRow, value: string) => Promise<void>
  onUploaded: (updated: PermitManagementRow, signedUrl?: string) => void
}

function PermitRow({ permit, signedUrl, onTransition, onSaveNumber, onUploaded }: PermitRowProps) {
  const { toast } = useToast()
  const [transitioning, setTransitioning] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [permitNumberDraft, setPermitNumberDraft] = useState(permit.permit_number ?? '')
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleTransition(to: PermitStatus) {
    setTransitioning(true)
    await onTransition(permit, to)
    setTransitioning(false)
  }

  async function handleUpload(file: File) {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch(`/api/admin/permits/${permit.id}/upload`, { method: 'POST', body: fd })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)

      // Fetch a fresh signed URL for the newly uploaded doc
      const urlRes = await fetch(`/api/admin/permits/${permit.id}/signed-url`)
      const urlJson = urlRes.ok ? await urlRes.json() : null

      onUploaded(json.data, urlJson?.signedUrl)
      toast({ title: `Document uploaded for ${permit.state_code}` })
    } catch (err) {
      toast({ title: 'Upload failed', description: String(err), variant: 'destructive' })
    } finally {
      setUploading(false)
    }
  }

  const transitionOptions: { label: string; to: PermitStatus }[] = []
  if (permit.status === 'pending')   transitionOptions.push({ label: 'Mark Submitted', to: 'submitted' })
  if (permit.status === 'submitted') transitionOptions.push(
    { label: 'Mark Issued',    to: 'issued'    },
    { label: 'Revert Pending', to: 'pending'   }
  )

  return (
    <div className="grid grid-cols-[64px_120px_180px_140px_auto] items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
      {/* State */}
      <span className="inline-flex items-center justify-center rounded-md bg-slate-100 px-2 py-1 font-mono text-sm font-bold text-slate-700">
        {permit.state_code}
      </span>

      {/* Status */}
      <StatusBadge status={permit.status} />

      {/* Permit number */}
      <div>
        {permit.status === 'issued' ? (
          <Input
            className="h-7 text-xs font-mono"
            placeholder="Permit #"
            value={permitNumberDraft}
            onChange={(e) => setPermitNumberDraft(e.target.value)}
            onBlur={() => {
              if (permitNumberDraft !== (permit.permit_number ?? '')) {
                onSaveNumber(permit, permitNumberDraft)
              }
            }}
          />
        ) : (
          <span className="text-xs text-muted-foreground">
            {permit.permit_number ?? '—'}
          </span>
        )}
      </div>

      {/* Cost */}
      <span className="font-mono text-sm">
        {permit.cost != null
          ? `$${permit.cost.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
          : <span className="text-muted-foreground">—</span>}
      </span>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2">
        {/* Document */}
        {signedUrl ? (
          <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" asChild>
            <a href={signedUrl} target="_blank" rel="noopener noreferrer">
              <FileText className="h-3 w-3" />
              View Doc
              <ExternalLink className="h-3 w-3" />
            </a>
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1 text-xs"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="h-3 w-3" />
            {uploading ? 'Uploading…' : 'Upload'}
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

        {/* Status transitions */}
        {transitionOptions.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" disabled={transitioning}>
                Actions <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {transitionOptions.map(({ label, to }) => (
                <DropdownMenuItem key={to} onSelect={() => handleTransition(to)}>
                  {label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  )
}
