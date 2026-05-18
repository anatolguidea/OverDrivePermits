export class AppError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details?: unknown
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export function badRequest(message: string, details?: unknown) {
  return new AppError(message, 400, details)
}

export function unauthorized(message = 'Unauthorized') {
  return new AppError(message, 401)
}

export function forbidden(message = 'Forbidden') {
  return new AppError(message, 403)
}

export function notFound(message = 'Not found') {
  return new AppError(message, 404)
}

export function conflict(message: string, details?: unknown) {
  return new AppError(message, 409, details)
}

export function validationFailed(details: unknown, message = 'Validation failed') {
  return new AppError(message, 422, details)
}

export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError
}

export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === 'string') return err
  return 'Unexpected error'
}
