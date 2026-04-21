'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { KeyRound, Eye, EyeOff, Plus, Trash2 } from 'lucide-react'
import { credentialSchema, type CredentialFormValues } from '@/lib/validators/credential.schema'
import type { CredentialDisplay } from '@/lib/repositories/credentials.repo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC',
]

interface CredentialsDialogProps {
  customerId: string
  customerName: string
  initialCredentials: CredentialDisplay[]
}

export function CredentialsDialog({ customerId, customerName, initialCredentials }: CredentialsDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <KeyRound className="mr-1.5 h-3.5 w-3.5" />
          State Credentials
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>State Portal Credentials — {customerName}</DialogTitle>
        </DialogHeader>
        <CredentialManager customerId={customerId} initialCredentials={initialCredentials} />
      </DialogContent>
    </Dialog>
  )
}

function CredentialManager({ customerId, initialCredentials }: { customerId: string; initialCredentials: CredentialDisplay[] }) {
  const { toast } = useToast()
  const [creds, setCreds] = useState<CredentialDisplay[]>(initialCredentials)
  const [addOpen, setAddOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<CredentialDisplay | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [revealed, setRevealed] = useState<Record<string, string>>({})
  const [revealing, setRevealing] = useState<string | null>(null)

  async function handleReveal(id: string) {
    if (revealed[id]) {
      // Toggle off — clear from memory
      setRevealed((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
      return
    }
    setRevealing(id)
    try {
      const res = await fetch(`/api/admin/credentials/${id}/reveal`)
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      setRevealed((prev) => ({ ...prev, [id]: json.password }))
    } catch (err) {
      toast({ title: 'Error', description: String(err), variant: 'destructive' })
    } finally {
      setRevealing(null)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      const res = await fetch(`/api/admin/credentials/${deleteTarget.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      setCreds((prev) => prev.filter((c) => c.id !== deleteTarget.id))
      setRevealed((prev) => {
        const next = { ...prev }
        delete next[deleteTarget.id]
        return next
      })
      toast({ title: 'Credential removed' })
    } catch (err) {
      toast({ title: 'Error', description: String(err), variant: 'destructive' })
    } finally {
      setDeleteLoading(false)
      setDeleteTarget(null)
    }
  }

  function onAdded(cred: CredentialDisplay) {
    setCreds((prev) => [...prev, cred].sort((a, b) => a.state_code.localeCompare(b.state_code)))
    setAddOpen(false)
  }

  return (
    <div className="space-y-4">
      {creds.length === 0 ? (
        <EmptyState title="No credentials" description="Add state portal logins for this customer." />
      ) : (
        <div className="rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-16">State</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Password</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {creds.map((c) => (
                <TableRow key={c.id} className="group">
                  <TableCell className="font-mono font-medium">{c.state_code}</TableCell>
                  <TableCell className="text-sm">{c.username}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-sm">
                        {revealed[c.id] ? revealed[c.id] : '••••••••'}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        disabled={revealing === c.id}
                        onClick={() => handleReveal(c.id)}
                        title={revealed[c.id] ? 'Hide password' : 'Reveal password'}
                      >
                        {revealed[c.id] ? (
                          <EyeOff className="h-3.5 w-3.5" />
                        ) : (
                          <Eye className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(c)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Credential
        </Button>
      </div>

      {/* Add credential inline dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add State Credential</DialogTitle>
          </DialogHeader>
          <AddCredentialForm
            customerId={customerId}
            onSaved={onAdded}
            onCancel={() => setAddOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Remove credential"
        description={`Remove ${deleteTarget?.state_code} credential for "${deleteTarget?.username}"? This cannot be undone.`}
        confirmLabel="Remove"
        destructive
        loading={deleteLoading}
        onConfirm={handleDelete}
      />
    </div>
  )
}

function AddCredentialForm({
  customerId,
  onSaved,
  onCancel,
}: {
  customerId: string
  onSaved: (c: CredentialDisplay) => void
  onCancel: () => void
}) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)

  const form = useForm<CredentialFormValues>({
    resolver: zodResolver(credentialSchema),
    defaultValues: { state_code: '', username: '', password: '', notes: '' },
  })

  async function onSubmit(values: CredentialFormValues) {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer_id: customerId, ...values }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(JSON.stringify(json.error))
      toast({ title: 'Credential saved' })
      onSaved(json.data)
    } catch (err) {
      toast({ title: 'Error', description: String(err), variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
        <FormField control={form.control} name="state_code" render={({ field }) => (
          <FormItem>
            <FormLabel>State *</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl><SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger></FormControl>
              <SelectContent>
                {US_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="username" render={({ field }) => (
          <FormItem>
            <FormLabel>Username *</FormLabel>
            <FormControl><Input autoComplete="off" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="password" render={({ field }) => (
          <FormItem>
            <FormLabel>Password *</FormLabel>
            <FormControl>
              <div className="relative">
                <Input
                  type={showPass ? 'text' : 'password'}
                  autoComplete="new-password"
                  className="pr-9"
                  {...field}
                />
                <button
                  type="button"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPass((v) => !v)}
                  tabIndex={-1}
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={loading}>Cancel</Button>
          <Button type="submit" size="sm" disabled={loading}>{loading ? 'Saving…' : 'Save'}</Button>
        </div>
      </form>
    </Form>
  )
}
