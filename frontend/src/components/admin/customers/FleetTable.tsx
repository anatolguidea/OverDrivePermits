'use client'
import { useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import type { TruckRow } from '@/lib/repositories/trucks.repo'
import type { TrailerRow } from '@/lib/repositories/trailers.repo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/admin/shared/ConfirmDialog'
import { EmptyState } from '@/components/admin/shared/EmptyState'
import { useToast } from '@/hooks/use-toast'
import { assertApiSuccess, csrfFetch, getThrownMessage, parseApiResponse } from '@/lib/http/client'
import { US_STATES } from '@/lib/constants/us-states'

// ---- Types ----------------------------------------------------------------

export type FleetEntry =
  | ({ _type: 'truck' } & TruckRow)
  | ({ _type: 'trailer' } & TrailerRow)

function mergeSorted(trucks: TruckRow[], trailers: TrailerRow[]): FleetEntry[] {
  const t = trucks.map((r) => ({ _type: 'truck' as const, ...r }))
  const tr = trailers.map((r) => ({ _type: 'trailer' as const, ...r }))
  return [...t, ...tr].sort((a, b) => {
    if (a._type !== b._type) return a._type === 'truck' ? -1 : 1
    return a.unit_number.localeCompare(b.unit_number)
  })
}

// ---- Validation -----------------------------------------------------------

const TRAILER_TYPES = ['flatbed', 'stepdeck', 'lowboy', 'curtainside', 'other'] as const
const VIN_RE = /^[A-HJ-NPR-Z0-9]{17}$/i

const fleetFormSchema = z.object({
  _type:             z.enum(['truck', 'trailer']),
  unit_number:       z.string().min(1, 'Unit number is required'),
  year:              z.number().int().min(1900).max(new Date().getFullYear() + 1)
                      .optional().or(z.nan().transform(() => undefined)),
  make:              z.string().optional().or(z.literal('')),
  model:             z.string().optional().or(z.literal('')),
  vin:               z.string().regex(VIN_RE, 'VIN must be 17 chars (A–Z, 0–9, no I/O/Q)')
                      .optional().or(z.literal('')),
  plate:             z.string().optional().or(z.literal('')),
  plate_state:       z.string().length(2).optional().or(z.literal('')),
  plate_expiry:      z.string().optional().or(z.literal('')),
  registered_weight: z.number().int().min(0).optional().or(z.nan().transform(() => undefined)),
  trailer_type:      z.string().optional().or(z.literal('')),
  active:            z.boolean().default(true),
})

type FleetFormValues = z.infer<typeof fleetFormSchema>

function entryToFormValues(entry: FleetEntry): FleetFormValues {
  if (entry._type === 'truck') {
    return {
      _type:             'truck',
      unit_number:       entry.unit_number,
      year:              entry.year ?? undefined,
      make:              entry.make ?? '',
      model:             entry.model ?? '',
      vin:               entry.vin ?? '',
      plate:             entry.plate ?? '',
      plate_state:       entry.plate_state ?? '',
      plate_expiry:      entry.plate_expiry ?? '',
      registered_weight: entry.registered_weight ?? undefined,
      trailer_type:      '',
      active:            entry.active,
    }
  }
  return {
    _type:        'trailer',
    unit_number:  entry.unit_number,
    year:         entry.year ?? undefined,
    make:         entry.make ?? '',
    model:        '',
    vin:          entry.vin ?? '',
    plate:        entry.plate ?? '',
    plate_state:  entry.plate_state ?? '',
    plate_expiry: entry.plate_expiry ?? '',
    trailer_type: entry.trailer_type ?? '',
    active:       entry.active,
  }
}

function blankFormValues(type: 'truck' | 'trailer'): FleetFormValues {
  return {
    _type: type, unit_number: '', year: undefined, make: '', model: '',
    vin: '', plate: '', plate_state: '', plate_expiry: '',
    registered_weight: undefined, trailer_type: '', active: true,
  }
}

// ---- FleetTable -----------------------------------------------------------

interface FleetTableProps {
  customerId: string
  initialTrucks: TruckRow[]
  initialTrailers: TrailerRow[]
}

export function FleetTable({ customerId, initialTrucks, initialTrailers }: FleetTableProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [fleet, setFleet] = useState<FleetEntry[]>(() => mergeSorted(initialTrucks, initialTrailers))
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<FleetEntry | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<FleetEntry | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  function openAdd() { setEditTarget(null); setDialogOpen(true) }
  function openEdit(e: FleetEntry) { setEditTarget(e); setDialogOpen(true) }

  function onSaved(entry: FleetEntry) {
    setFleet((prev) => {
      const updated = editTarget
        ? prev.map((e) => (e.id === entry.id ? entry : e))
        : [...prev, entry]
      return mergeSorted(
        updated.filter((e) => e._type === 'truck') as ({ _type: 'truck' } & TruckRow)[],
        updated.filter((e) => e._type === 'trailer') as ({ _type: 'trailer' } & TrailerRow)[],
      )
    })
    setDialogOpen(false)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleteLoading(true)
    const url = deleteTarget._type === 'truck'
      ? `/api/admin/trucks/${deleteTarget.id}`
      : `/api/admin/trailers/${deleteTarget.id}`
    try {
      const res = await csrfFetch(url, { method: 'DELETE' })
      await assertApiSuccess(res, 'Failed to delete vehicle')
      setFleet((prev) => prev.filter((e) => e.id !== deleteTarget.id))
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['trucks', customerId] }),
        queryClient.invalidateQueries({ queryKey: ['trailers', customerId] }),
      ])
      toast({ title: `${deleteTarget._type === 'truck' ? 'Truck' : 'Trailer'} removed` })
    } catch (err) {
      toast({ title: 'Error', description: getThrownMessage(err), variant: 'destructive' })
    } finally {
      setDeleteLoading(false)
      setDeleteTarget(null)
    }
  }

  const trucks   = fleet.filter((e) => e._type === 'truck').length
  const trailers = fleet.filter((e) => e._type === 'trailer').length

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {trucks} truck{trucks !== 1 ? 's' : ''} · {trailers} trailer{trailers !== 1 ? 's' : ''}
        </p>
        <Button size="sm" variant="outline" onClick={openAdd}>
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Vehicle
        </Button>
      </div>

      {fleet.length === 0 ? (
        <EmptyState title="No vehicles" description="Add a truck or trailer to this customer." />
      ) : (
        <div className="admin-table-wrap">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50">
                <TableHead className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Unit #</TableHead>
                <TableHead className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Type</TableHead>
                <TableHead className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Year / Make</TableHead>
                <TableHead className="text-[11px] uppercase tracking-[0.14em] text-slate-500">VIN</TableHead>
                <TableHead className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Plate</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {fleet.map((e) => (
                <TableRow key={e.id} className="group">
                  <TableCell className="font-medium">{e.unit_number}</TableCell>
                  <TableCell>
                    <Badge variant={e._type === 'truck' ? 'default' : 'secondary'} className="text-xs capitalize">
                      {e._type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {[e.year, e.make].filter(Boolean).join(' ') || '—'}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{e.vin ?? '—'}</TableCell>
                  <TableCell className="text-sm">
                    {e.plate ? `${e.plate}${e.plate_state ? ` (${e.plate_state})` : ''}` : '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(e)}>
                        <Pencil className="h-3.5 w-3.5" />
                        <span className="sr-only">Edit {e.unit_number}</span>
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(e)}>
                        <Trash2 className="h-3.5 w-3.5" />
                        <span className="sr-only">Delete {e.unit_number}</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <FleetDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        customerId={customerId}
        entry={editTarget}
        onSaved={onSaved}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Remove ${deleteTarget?._type ?? 'vehicle'}`}
        description={`Remove unit "${deleteTarget?.unit_number}"? Active orders using this vehicle will not be affected.`}
        confirmLabel="Remove"
        destructive
        loading={deleteLoading}
        onConfirm={handleDelete}
      />
    </div>
  )
}

// ---- FleetDialog ----------------------------------------------------------

interface FleetDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customerId: string
  entry: FleetEntry | null
  onSaved: (entry: FleetEntry) => void
}

function FleetDialog({ open, onOpenChange, customerId, entry, onSaved }: FleetDialogProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [loading, setLoading] = useState(false)
  const isEdit = !!entry

  const form = useForm<FleetFormValues>({
    resolver: zodResolver(fleetFormSchema),
    defaultValues: entry ? entryToFormValues(entry) : blankFormValues('truck'),
  })

  const selectedType = form.watch('_type')

  useEffect(() => {
    form.reset(entry ? entryToFormValues(entry) : blankFormValues('truck'))
  }, [entry, form])

  // When type changes while adding, reset type-specific fields
  useEffect(() => {
    if (!isEdit) {
      form.setValue('model', '')
      form.setValue('registered_weight', undefined)
      form.setValue('trailer_type', '')
    }
  }, [selectedType, isEdit, form])

  async function onSubmit(values: FleetFormValues) {
    if (loading) return
    setLoading(true)
    try {
      const { _type, model, registered_weight, trailer_type, ...common } = values
      const normalized = Object.fromEntries(
        Object.entries(common).map(([k, v]) => [k, v === '' || (typeof v === 'number' && isNaN(v as number)) ? null : v])
      )

      let body: Record<string, unknown>
      let url: string
      const method = isEdit ? 'PATCH' : 'POST'

      if (_type === 'truck') {
        url = isEdit ? `/api/admin/trucks/${entry!.id}` : '/api/admin/trucks'
        body = isEdit
          ? { ...normalized, model: model || null, registered_weight: registered_weight ?? null }
          : { ...normalized, model: model || null, registered_weight: registered_weight ?? null, customer_id: customerId }
      } else {
        url = isEdit ? `/api/admin/trailers/${entry!.id}` : '/api/admin/trailers'
        body = isEdit
          ? { ...normalized, trailer_type: trailer_type || null }
          : { ...normalized, trailer_type: trailer_type || null, customer_id: customerId }
      }

      const res = await csrfFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await parseApiResponse<TruckRow | TrailerRow>(res, 'Failed to save vehicle')

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['trucks', customerId] }),
        queryClient.invalidateQueries({ queryKey: ['trailers', customerId] }),
      ])
      toast({ title: isEdit ? 'Vehicle updated' : 'Vehicle added' })
      onSaved({ _type, ...data } as FleetEntry)
      form.reset(blankFormValues('truck'))
    } catch (err) {
      toast({ title: 'Error', description: getThrownMessage(err), variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Vehicle' : 'Add Vehicle'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

            {/* Type selector — locked in edit mode */}
            <FormField control={form.control} name="_type" render={({ field }) => (
              <FormItem>
                <FormLabel>Vehicle Type *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={isEdit}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="truck">Truck</SelectItem>
                    <SelectItem value="trailer">Trailer</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid gap-4 sm:grid-cols-2">
              <FF control={form.control} name="unit_number" label="Unit # *" placeholder="T-101" />
              <FF control={form.control} name="make" label="Make" placeholder="Kenworth" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField control={form.control} name="year" render={({ field }) => (
                <FormItem>
                  <FormLabel>Year</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="2022" {...field} value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.valueAsNumber)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              {selectedType === 'truck' ? (
                <FF control={form.control} name="model" label="Model" placeholder="T680" />
              ) : (
                <FormField control={form.control} name="trailer_type" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Trailer Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ''}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {TRAILER_TYPES.map((t) => (
                          <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              )}
            </div>

            <FormField control={form.control} name="vin" render={({ field }) => (
              <FormItem>
                <FormLabel>VIN</FormLabel>
                <FormControl>
                  <Input placeholder="17-character VIN" className="font-mono uppercase" maxLength={17}
                    {...field} onChange={(e) => field.onChange(e.target.value.toUpperCase())} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid gap-4 sm:grid-cols-3">
              <FF control={form.control} name="plate" label="Plate #" placeholder="ABC1234" />
              <FormField control={form.control} name="plate_state" render={({ field }) => (
                <FormItem>
                  <FormLabel>Plate State</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ''}>
                    <FormControl><SelectTrigger><SelectValue placeholder="State" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {US_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="plate_expiry" render={({ field }) => (
                <FormItem>
                  <FormLabel>Plate Expiry</FormLabel>
                  <FormControl><Input type="date" {...field} value={field.value ?? ''} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {selectedType === 'truck' && (
              <FormField control={form.control} name="registered_weight" render={({ field }) => (
                <FormItem>
                  <FormLabel>Registered Weight (lbs)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="80000" {...field} value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.valueAsNumber)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={loading}>
                {loading ? 'Saving…' : isEdit ? 'Save' : 'Add Vehicle'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

// ---- tiny helper ----------------------------------------------------------

function FF({
  control, name, label, placeholder,
}: {
  control: import('react-hook-form').Control<FleetFormValues>
  name: keyof FleetFormValues
  label: string
  placeholder?: string
}) {
  return (
    <FormField control={control} name={name} render={({ field }) => (
      <FormItem>
        <FormLabel>{label}</FormLabel>
        <FormControl><Input placeholder={placeholder} {...field} value={field.value as string ?? ''} /></FormControl>
        <FormMessage />
      </FormItem>
    )} />
  )
}
