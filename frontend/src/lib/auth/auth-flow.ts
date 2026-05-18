export type LoginSuccessStatus = 'MFA_REQUIRED' | 'AUTHENTICATED'

export type LoginErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'NOT_ADMIN'
  | 'MFA_NOT_CONFIGURED'
  | 'RATE_LIMITED'
  | 'INVALID_REQUEST'

export type TwoFactorStateStatus =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN_NOT_ADMIN'
  | 'NEEDS_ENROLLMENT'
  | 'VERIFY_REQUIRED'
  | 'AUTHENTICATED'

