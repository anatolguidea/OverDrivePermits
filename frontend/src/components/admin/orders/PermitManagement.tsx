'use client'
import { useState, useRef } from 'react'
import { csrfFetch } from '@/lib/http/client'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Upload,
  FileText,
  ExternalLink,
  ChevronDown,
  GripVertical,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { StatusBadge } from '@/components/admin/shared/StatusBadge'
import { useToast } from '@/hooks/use-toast'
import type { PermitStatus } from '@/lib/supabase/types'

export interface PermitManagementRow {
  id: string
  jurisdiction: string
  status: PermitStatus
  cost: number | null
  permit_number: string | null
  document_url: string | null
  submitted_at: string | null
  issue_date: string | null
  sort_order: number
}

interface PermitManagementProps {
  orderId: string
  initialPermits: PermitManagementRow[]
  documentSignedUrls: Record<string, string>
}

// Full status transition graph
const TRANSITIONS: Record<PermitStatus, { label: string; to: PermitStatus }[]> = {
  pending:     [{ label: 'Mark In Progress', to: 'in_progress' }, { label: 'Mark Not Needed', to: 'not_needed' }],
  in_progress: [{ label: 'Mark Submitted',   to: 'submitted'   }, { label: 'Mark Rejected',   to: 'rejected'   }, { label: 'Revert Pending', to: 'pending' }],
  submitted:   [{ label: 'Mark Issued',      to: 'issued'      }, { label: 'Mark Rejected',   to: 'rejected'   }, { label: 'Revert Pending', to: 'pending' }],
  issued:      [{ label: 'Revert Submitted', to: 'submitted'   }],
  rejected:    [{ label: 'Mark In Progress', to: 'in_progress' }, { label: 'Revert Pending',  to: 'pending'    }],
  not_needed:  [{ label: 'Revert Pending',   to: 'pending'     }],
}

export function PermitManagement({ orderId, initialPermits, documentSignedUrls }: PermitManagementProps) {
  const { toast } = useToast()
  const [permits, setPermits] = useState(() =>
    [...initialPermits].sort((a, b) => a.sort_order - b.sort_order)
  )
  const [signedUrls, setSignedUrls] = useState(documentSignedUrls)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function updateLocal(id: string, patch: Partial<PermitManagementRow>) {
    setPermits((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  }

  async function transitionStatus(permit: PermitManagementRow, to: PermitStatus) {
    try {
      const res = await csrfFetch(`/api/admin/permits/${permit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: to }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      updateLocal(permit.id, json.data)
      toast({ title: `${permit.jurisdiction} marked ${to.replace('_', ' ')}` })
    } catch (err) {
      toast({ title: 'Error', description: String(err), variant: 'destructive' })
    }
  }

  async function savePermitNumber(permit: PermitManagementRow, value: string) {
    try {
      const res = await csrfFetch(`/api/admin/permits/${permit.id}`, {
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

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = permits.findIndex((p) => p.id === active.id)
    const newIndex = permits.findIndex((p) => p.id === over.id)
    const reordered = arrayMove(permits, oldIndex, newIndex).map((p, i) => ({ ...p, sort_order: i }))
    setPermits(reordered)

    try {
      await csrfFetch(`/api/admin/orders/${orderId}/permits/reorder`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: reordered.map((p) => p.id) }),
      })
    } catch {
      // revert on failure
      setPermits(permits)
      toast({ title: 'Reorder failed', variant: 'destructive' })
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={permits.map((p) => p.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {permits.map((permit) => (
            <SortablePermitRow
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
      </SortableContext>
    </DndContext>
  )
}

// ─── Sortable permit row ─────────────────────────────────────────────────────

interface PermitRowProps {
  permit: PermitManagementRow
  signedUrl?: string
  onTransition: (permit: PermitManagementRow, to: PermitStatus) => Promise<void>
  onSaveNumber: (permit: PermitManagementRow, value: string) => Promise<void>
  onUploaded: (updated: PermitManagementRow, signedUrl?: string) => void
}

function SortablePermitRow(props: PermitRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.permit.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style}>
      <PermitRow {...props} dragHandleProps={{ ...attributes, ...listeners }} />
    </div>
  )
}

function PermitRow({
  permit,
  signedUrl,
  onTransition,
  onSaveNumber,
  onUploaded,
  dragHandleProps,
}: PermitRowProps & { dragHandleProps?: React.HTMLAttributes<HTMLButtonElement> }) {
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
      const res = await csrfFetch(`/api/admin/permits/${permit.id}/upload`, { method: 'POST', body: fd })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)

      const urlRes = await fetch(`/api/admin/permits/${permit.id}/signed-url`)
      const urlJson = urlRes.ok ? await urlRes.json() : null

      onUploaded(json.data, urlJson?.signedUrl)
      toast({ title: `Document uploaded for ${permit.jurisdiction}` })
    } catch (err) {
      toast({ title: 'Upload failed', description: String(err), variant: 'destructive' })
    } finally {
      setUploading(false)
    }
  }

  const transitionOptions = TRANSITIONS[permit.status] ?? []

  return (
    <div className="grid grid-cols-[24px_64px_120px_180px_140px_auto] items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
      {/* Drag handle */}
      <button
        type="button"
        className="cursor-grab text-muted-foreground hover:text-foreground focus:outline-none"
        aria-label="Drag to reorder"
        {...dragHandleProps}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Jurisdiction */}
      <span className="inline-flex items-center justify-center rounded-md bg-slate-100 px-2 py-1 font-mono text-sm font-bold text-slate-700">
        {permit.jurisdiction}
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
        )}
      </div>
    </div>
  )
}
