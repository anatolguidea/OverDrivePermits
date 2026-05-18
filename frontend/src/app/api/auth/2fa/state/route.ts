import 'server-only'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiSuccess } from '@/lib/http/admin'
import { getAdminContext } from '@/lib/auth/assertAdmin'
import type { TwoFactorStateStatus } from '@/lib/auth/auth-flow'
import { ensureCriticalEnvConfigured } from '@/lib/config/env'
import {
  isAdminDashboardRole,
  isTwoFactorEnabled,
} from '@/lib/auth/policy'

export async function GET(_: NextRequest) {
  ensureCriticalEnvConfigured()
  const supabase = await createClient()
  const context = await getAdminContext(supabase)

  if (!context) {
    return apiSuccess({ status: 'UNAUTHORIZED' satisfies TwoFactorStateStatus })
  }

  if (!isAdminDashboardRole(context.role)) {
    return apiSuccess({ status: 'FORBIDDEN_NOT_ADMIN' satisfies TwoFactorStateStatus })
  }

  if (!isTwoFactorEnabled()) {
    return apiSuccess({ status: 'AUTHENTICATED' satisfies TwoFactorStateStatus })
  }

  if (!context.twoFactorEnrolled) {
    return apiSuccess({ status: 'NEEDS_ENROLLMENT' satisfies TwoFactorStateStatus })
  }

  if (!context.twoFactorVerified) {
    return apiSuccess({ status: 'VERIFY_REQUIRED' satisfies TwoFactorStateStatus })
  }

  return apiSuccess({ status: 'AUTHENTICATED' satisfies TwoFactorStateStatus })
}
