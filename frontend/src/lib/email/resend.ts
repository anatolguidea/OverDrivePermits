import 'server-only'
import { Resend } from 'resend'
import { badRequest } from '@/lib/errors'

let client: Resend | null = null

export function getResendClient(): Resend {
  if (client) return client

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw badRequest('RESEND_API_KEY is not configured')
  }

  client = new Resend(apiKey)
  return client
}
