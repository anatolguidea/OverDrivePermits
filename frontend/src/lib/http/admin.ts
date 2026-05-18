import { NextResponse } from 'next/server'
import type { ZodSchema } from 'zod'
import { ZodError } from 'zod'
import { AppError, getErrorMessage, isAppError, validationFailed } from '@/lib/errors'
import { logger } from '@/lib/observability/logger'

export function apiSuccess<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ success: true, data }, init)
}

export function apiPage<T extends object>(payload: T, init?: ResponseInit) {
  return NextResponse.json({ success: true, ...payload }, init)
}

export function apiCreated<T>(data: T) {
  return apiSuccess(data, { status: 201 })
}

export function apiNoContent() {
  return new NextResponse(null, { status: 204 })
}

export function apiError(error: string, status = 500, details?: unknown) {
  return NextResponse.json(
    details === undefined
      ? { success: false, error }
      : { success: false, error, details },
    { status }
  )
}

export function handleApiError(err: unknown) {
  if (err instanceof ZodError) {
    return apiError('Validation failed', 422, err.flatten())
  }

  if (isAppError(err)) {
    return apiError(err.message, err.status, err.details)
  }

  logger.error('unhandled api error', {
    error: getErrorMessage(err),
    stack: err instanceof Error ? err.stack ?? null : null,
  })

  return apiError(getErrorMessage(err), 500)
}

export function parseWithSchema<T>(schema: ZodSchema<T>, input: unknown): T {
  const parsed = schema.safeParse(input)
  if (!parsed.success) {
    throw validationFailed(parsed.error.flatten())
  }
  return parsed.data
}

export function assertTruthy<T>(value: T | null | undefined, error: AppError): T {
  if (value == null) {
    throw error
  }
  return value
}
