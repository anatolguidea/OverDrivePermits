'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { vehicleSchema, type VehicleFormValues } from '@/lib/validators/vehicle.schema'
import type { VehicleRow } from '@/lib/repositories/vehicles.repo'
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
import { ConfirmDialog } from '@/components/admin/shared/ConfirmDialog'
import { EmptyState } from '@/components/admin/shared/EmptyState'
import { useToast } from '@/hooks/use-toast'

interface FleetTableProps {
  customerId: string
  initialVehicles: VehicleRow[]
}

export function FleetTable({ customerId, initialVehicles }: FleetTableProps) {
  const { toast } = useToast()
  const [vehicles, setVehicles] = useState<VehicleRow[]>(initialVehicles)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<VehicleRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<VehicleRow | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  function openAdd() {
    setEditTarget(null)
    setDialogOpen(true)
  }

  function openEdit(v: VehicleRow) {
    setEditTarget(v)
    setDialogOpen(true)
  }

  function onSaved(vehicle: VehicleRow) {
    setVehicles((prev) =>
      editTarget
        ? prev.map((v) => (v.id === vehicle.id ? vehicle : v))
        : [...prev, vehicle]
    )
    setDialogOpen(false)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      const res = await fetch(`/api/admin/vehicles/${deleteTarget.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      setVehicles((prev) => prev.filter((v) => v.id !== deleteTarget.id))
      toast({ title: 'Vehicle removed' })
    } catch (err) {
      toast({ title: 'Error', description: String(err), variant: 'destructive' })
    } finally {
      setDeleteLoading(false)
      setDeleteTarget(null)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{vehicles.length} vehicle{vehicles.length !== 1 ? 's' : ''}</p>
        <Button size="sm" variant="outline" onClick={openAdd}>
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Vehicle
        </Button>
      </div>

      {vehicles.length === 0 ? (
        <EmptyState title="No vehicles" description="Add a truck or trailer to this customer." />
      ) : (
        <div className="rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Unit #</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Make / Year</TableHead>
                <TableHead>VIN</TableHead>
                <TableHead>Plate</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {vehicles.map((v) => (
                <TableRow key={v.id} className="group">
                  <TableCell className="font-medium">{v.unit_number}</TableCell>
                  <TableCell className="capitalize text-sm">{v.vehicle_type}</TableCell>
                  <TableCell className="text-sm">
                    {[v.make, v.year].filter(Boolean).join(' ') || '—'}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{v.vin ?? '—'}</TableCell>
                  <TableCell className="text-sm">{v.plate_number ?? '—'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(v)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(v)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <VehicleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        customerId={customerId}
        vehicle={editTarget}
        onSaved={onSaved}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Remove vehicle"
        description={`Remove unit "${deleteTarget?.unit_number}" from this customer? Orders using this vehicle will not be affected.`}
        confirmLabel="Remove"
        destructive
        loading={deleteLoading}
        onConfirm={handleDelete}
      />
    </div>
  )
}

// ---- VehicleDialog ----

interface VehicleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customerId: string
  vehicle: VehicleRow | null
  onSaved: (vehicle: VehicleRow) => void
}

function VehicleDialog({ open, onOpenChange, customerId, vehicle, onSaved }: VehicleDialogProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const isEdit = !!vehicle

  const form = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      unit_number:  vehicle?.unit_number  ?? '',
      vehicle_type: vehicle?.vehicle_type ?? 'truck',
      vin:          vehicle?.vin          ?? '',
      plate_number: vehicle?.plate_number ?? '',
      make:         vehicle?.make         ?? '',
      year:         vehicle?.year         ?? undefined,
    },
  })

  // Reset form when vehicle changes
  useState(() => {
    form.reset({
      unit_number:  vehicle?.unit_number  ?? '',
      vehicle_type: vehicle?.vehicle_type ?? 'truck',
      vin:          vehicle?.vin          ?? '',
      plate_number: vehicle?.plate_number ?? '',
      make:         vehicle?.make         ?? '',
      year:         vehicle?.year         ?? undefined,
    })
  })

  async function onSubmit(values: VehicleFormValues) {
    setLoading(true)
    try {
      const url = isEdit ? `/api/admin/vehicles/${vehicle!.id}` : '/api/admin/vehicles'
      const method = isEdit ? 'PATCH' : 'POST'
      const body = isEdit ? values : { ...values, customer_id: customerId }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!json.success) throw new Error(JSON.stringify(json.error))
      toast({ title: isEdit ? 'Vehicle updated' : 'Vehicle added' })
      onSaved(json.data)
      form.reset()
    } catch (err) {
      toast({ title: 'Error', description: String(err), variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Vehicle' : 'Add Vehicle'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField control={form.control} name="unit_number" render={({ field }) => (
                <FormItem>
                  <FormLabel>Unit # *</FormLabel>
                  <FormControl><Input placeholder="e.g. T-101" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="vehicle_type" render={({ field }) => (
                <FormItem>
                  <FormLabel>Type *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="truck">Truck</SelectItem>
                      <SelectItem value="trailer">Trailer</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField control={form.control} name="make" render={({ field }) => (
                <FormItem>
                  <FormLabel>Make</FormLabel>
                  <FormControl><Input placeholder="e.g. Kenworth" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="year" render={({ field }) => (
                <FormItem>
                  <FormLabel>Year</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="e.g. 2022"
                      {...field}
                      onChange={(e) => field.onChange(e.target.valueAsNumber)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="vin" render={({ field }) => (
              <FormItem>
                <FormLabel>VIN</FormLabel>
                <FormControl>
                  <Input
                    placeholder="17-character VIN"
                    className="font-mono uppercase"
                    maxLength={17}
                    {...field}
                    onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="plate_number" render={({ field }) => (
              <FormItem>
                <FormLabel>Plate #</FormLabel>
                <FormControl><Input placeholder="e.g. ABC1234" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
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
