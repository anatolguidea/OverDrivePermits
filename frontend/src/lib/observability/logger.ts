type LogLevel = 'info' | 'warn' | 'error'

type LogValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | LogValue[]
  | { [key: string]: LogValue }

const REDACTED = '[REDACTED]'
const SENSITIVE_KEY_PATTERN = /(pass(word)?|token|secret|authorization|cookie|api[-_]?key|session)/i

export function redactValue(value: LogValue, key?: string): LogValue {
  if (key && SENSITIVE_KEY_PATTERN.test(key)) {
    return REDACTED
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item))
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([entryKey, entryValue]) => [
        entryKey,
        redactValue(entryValue as LogValue, entryKey),
      ])
    )
  }

  return value
}

export function toLogEntry(
  level: LogLevel,
  message: string,
  metadata: Record<string, LogValue> = {},
  now = new Date()
): Record<string, LogValue> {
  const redactedMetadata = redactValue(metadata) as Record<string, LogValue>
  return {
    level,
    message,
    ...redactedMetadata,
    timestamp: now.toISOString(),
  }
}

function write(level: LogLevel, message: string, metadata?: Record<string, LogValue>) {
  const entry = JSON.stringify(toLogEntry(level, message, metadata))
  if (level === 'error') {
    console.error(entry)
    return
  }
  if (level === 'warn') {
    console.warn(entry)
    return
  }
  console.info(entry)
}

export const logger = {
  info: (message: string, metadata?: Record<string, LogValue>) => write('info', message, metadata),
  warn: (message: string, metadata?: Record<string, LogValue>) => write('warn', message, metadata),
  error: (message: string, metadata?: Record<string, LogValue>) => write('error', message, metadata),
}
