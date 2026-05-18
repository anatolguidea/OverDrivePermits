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
