export function getSafeAdminRedirect(value: string | null): string {
  if (!value) return '/admin/dashboard'
  if (!value.startsWith('/admin')) return '/admin/dashboard'
  if (value.startsWith('//')) return '/admin/dashboard'

  try {
    const parsed = new URL(value, 'http://localhost')
    if (parsed.origin !== 'http://localhost') return '/admin/dashboard'
    return `${parsed.pathname}${parsed.search}`
  } catch {
    return '/admin/dashboard'
  }
}

