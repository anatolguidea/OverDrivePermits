import {
  isTwoFactorEnabled,
  isTwoFactorRequiredRole,
} from './policy'

export const ADMIN_2FA_COOKIE_NAME = 'admin_2fa'
export const ADMIN_2FA_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 12

export function buildTwoFactorChallenge(enrolled: boolean) {
  return {
    requiresTwoFactor: true as const,
    enrolled,
  }
}

export function buildTwoFactorRedirect(requestUrl: string): URL {
  const current = new URL(requestUrl)
  const loginUrl = new URL('/login', current)
  loginUrl.searchParams.set('mfa', 'required')
  loginUrl.searchParams.set('redirectTo', `${current.pathname}${current.search}`)
  return loginUrl
}

export {
  isTwoFactorEnabled,
  isTwoFactorRequiredRole,
}
