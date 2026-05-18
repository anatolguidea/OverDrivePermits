/** Reads the __csrf cookie value set by middleware (httpOnly: false). */
export function getCsrfToken(): string {
  if (typeof document === 'undefined') return ''
  const match = document.cookie.match(/(?:^|;\s*)__csrf=([^;]*)/)
  return match ? decodeURIComponent(match[1]) : ''
}

/**
 * Drop-in replacement for `fetch` that automatically attaches the CSRF token
 * header on every call. Use for all non-GET API mutations from client components.
 */
export function csrfFetch(url: string, init: RequestInit = {}): Promise<Response> {
  return fetch(url, {
    ...init,
    headers: {
      ...init.headers,
      'x-csrf-token': getCsrfToken(),
    },
  })
}

type ApiEnvelope<T> =
  | { success: true; data: T }
  | { success: false; error?: unknown; message?: unknown; details?: unknown }

function firstValidationMessage(details: unknown): string | null {
  if (!details || typeof details !== 'object') return null

  const fieldErrors = (details as { fieldErrors?: unknown }).fieldErrors
  if (!fieldErrors || typeof fieldErrors !== 'object') return null

  for (const messages of Object.values(fieldErrors)) {
    if (Array.isArray(messages) && typeof messages[0] === 'string' && messages[0]) {
      return messages[0]
    }
  }

  return null
}

export function getApiErrorMessage(payload: unknown, fallback = 'Request failed'): string {
  if (!payload || typeof payload !== 'object') return fallback

  const envelope = payload as { error?: unknown; message?: unknown; details?: unknown }
  if (typeof envelope.error === 'string' && envelope.error.trim()) return envelope.error
  if (typeof envelope.message === 'string' && envelope.message.trim()) return envelope.message

  return firstValidationMessage(envelope.details) ?? fallback
}

export async function parseApiResponse<T>(response: Response, fallback = 'Request failed'): Promise<T> {
  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null

  if (!response.ok || !payload?.success) {
    throw new Error(getApiErrorMessage(payload, response.statusText || fallback))
  }

  return payload.data
}

export async function assertApiSuccess(response: Response, fallback = 'Request failed'): Promise<void> {
  if (response.ok) return

  const payload = await response.json().catch(() => null)
  throw new Error(getApiErrorMessage(payload, response.statusText || fallback))
}

export function getThrownMessage(error: unknown, fallback = 'Request failed'): string {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === 'string' && error.trim()) return error
  return fallback
}
