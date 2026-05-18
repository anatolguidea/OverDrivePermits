'use client'
import '@/styles/admin.css'
import { Suspense, useEffect, useMemo, useState, type FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Truck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { csrfFetch } from '@/lib/http/client'
import type { LoginSuccessStatus, TwoFactorStateStatus } from '@/lib/auth/auth-flow'
import { getSafeAdminRedirect } from '@/lib/auth/redirects'

const twoFactorSchema = z.object({
  code: z.string().length(6, 'Code must be 6 digits').regex(/^\d{6}$/, 'Code must be 6 digits'),
})

type TwoFactorValues = z.infer<typeof twoFactorSchema>
type LoginUiState = 'credentials' | 'mfa_loading' | 'mfa_enroll' | 'mfa_verify'

interface TwoFactorState {
  secret?: string
  uri?: string
}

interface ApiEnvelope<T> {
  success: boolean
  data?: T
  error?: string
  details?: { code?: string }
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = getSafeAdminRedirect(searchParams.get('redirectTo'))
  const mfaRequired = searchParams.get('mfa') === 'required'

  const [serverError, setServerError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [uiState, setUiState] = useState<LoginUiState>(mfaRequired ? 'mfa_loading' : 'credentials')
  const [twoFactorState, setTwoFactorState] = useState<TwoFactorState>({})
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const verificationForm = useForm<TwoFactorValues>({
    resolver: zodResolver(twoFactorSchema),
    defaultValues: { code: '' },
  })

  const isMfaMode = useMemo(
    () => uiState === 'mfa_loading' || uiState === 'mfa_enroll' || uiState === 'mfa_verify',
    [uiState]
  )

  useEffect(() => {
    setUiState(mfaRequired ? 'mfa_loading' : 'credentials')
  }, [mfaRequired])

  useEffect(() => {
    if (!mfaRequired) return

    void refreshTwoFactorState()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mfaRequired])

  async function refreshTwoFactorState() {
    if (loading) return

    setLoading(true)
    setServerError(null)
    setUiState('mfa_loading')

    try {
      const response = await fetch('/api/auth/2fa/state', { cache: 'no-store' })
      const json = (await response.json().catch(() => null)) as ApiEnvelope<{ status: TwoFactorStateStatus }> | null

      if (!json?.success || !json.data?.status) {
        throw new Error(String(json?.error ?? 'Unable to load 2FA status.'))
      }

      switch (json.data.status) {
        case 'UNAUTHORIZED': {
          router.replace('/login')
          setUiState('credentials')
          return
        }
        case 'FORBIDDEN_NOT_ADMIN': {
          throw new Error('Only admin accounts can access this dashboard.')
        }
        case 'AUTHENTICATED': {
          router.push(redirectTo)
          router.refresh()
          return
        }
        case 'NEEDS_ENROLLMENT': {
          await startEnrollment()
          return
        }
        case 'VERIFY_REQUIRED': {
          setUiState('mfa_verify')
          return
        }
      }
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'Unable to start 2FA verification.')
      setUiState('mfa_verify')
    } finally {
      setLoading(false)
    }
  }

  async function startEnrollment() {
    const response = await csrfFetch('/api/auth/2fa/enroll', { method: 'POST' })
    const json = (await response.json()) as ApiEnvelope<{ secret: string; uri: string }>

    if (!json.success || !json.data) {
      throw new Error(String(json.error ?? 'Unable to create 2FA enrollment.'))
    }

    setTwoFactorState({
      secret: json.data.secret,
      uri: json.data.uri,
    })
    setUiState('mfa_enroll')
  }

  async function onLoginSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (loading) return

    setLoading(true)
    setServerError(null)

    try {
      const normalizedEmail = email.trim().toLowerCase()
      if (!normalizedEmail || !password) {
        throw new Error('Please enter email and password.')
      }

      const response = await csrfFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: normalizedEmail,
          password,
        }),
      })
      const json = (await response.json()) as ApiEnvelope<{ status: LoginSuccessStatus; enrolled?: boolean }>

      if (!json.success || !json.data) {
        throw new Error(String(json.error ?? 'Invalid email or password.'))
      }

      switch (json.data.status) {
        case 'AUTHENTICATED': {
          router.push(redirectTo)
          router.refresh()
          return
        }
        case 'MFA_REQUIRED': {
          if (json.data.enrolled) {
            setUiState('mfa_verify')
            return
          }

          await startEnrollment()
          return
        }
      }
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'Invalid email or password.')
    } finally {
      setLoading(false)
    }
  }

  async function onVerify(values: TwoFactorValues) {
    if (loading) return

    setLoading(true)
    setServerError(null)

    try {
      const response = await csrfFetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const json = (await response.json()) as ApiEnvelope<{ ok: true }>

      if (!json.success) {
        throw new Error(String(json.error ?? 'Invalid verification code.'))
      }

      router.push(redirectTo)
      router.refresh()
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'Invalid verification code.')
    } finally {
      setLoading(false)
    }
  }

  if (isMfaMode) {
    return (
      <div className="space-y-4">
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>Two-factor authentication is required before you can access the admin console.</p>
          {uiState === 'mfa_loading' ? (
            <p>Preparing your verification challenge…</p>
          ) : uiState === 'mfa_enroll' ? (
            <>
              <p>Add this secret to your authenticator app, then enter the 6-digit code below.</p>
              {twoFactorState.secret ? (
                <div className="rounded-md border bg-muted/40 p-3 font-mono text-xs break-all">
                  {twoFactorState.secret}
                </div>
              ) : null}
              {twoFactorState.uri ? (
                <div className="rounded-md border bg-muted/40 p-3 font-mono text-[10px] break-all">
                  {twoFactorState.uri}
                </div>
              ) : null}
            </>
          ) : (
            <p>Enter the 6-digit code from your authenticator app.</p>
          )}
        </div>

        <Form {...verificationForm}>
          <form onSubmit={verificationForm.handleSubmit(onVerify)} className="space-y-4">
            <FormField
              control={verificationForm.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Authentication code</FormLabel>
                  <FormControl>
                    <Input
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="123456"
                      {...field}
                      disabled={loading || uiState === 'mfa_loading'}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {serverError ? <p className="text-sm text-destructive">{serverError}</p> : null}
            <Button type="submit" className="w-full" disabled={loading || uiState === 'mfa_loading'}>
              {loading ? 'Verifying…' : 'Verify and continue'}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => void refreshTwoFactorState()}
              disabled={loading}
            >
              Refresh 2FA status
            </Button>
          </form>
        </Form>
      </div>
    )
  }

  return (
    <form onSubmit={onLoginSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="login-email">Email</Label>
        <Input
          id="login-email"
          type="email"
          placeholder="admin@oswpermits.com"
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="login-password">Password</Label>
        <Input
          id="login-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
        />
      </div>
      {serverError ? <p className="text-sm text-destructive">{serverError}</p> : null}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  )
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="space-y-3 text-center">
          <div className="flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
              <Truck className="h-6 w-6 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-xl">OSW Permits Admin</CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div className="h-48" />}>
            <LoginForm />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}
