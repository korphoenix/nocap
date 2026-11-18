import { createHash, timingSafeEqual } from 'node:crypto'
import type { H3Event } from 'h3'

const hash = (value: string) => createHash('sha256').update(value).digest()

export function requireAdmin(event: H3Event) {
  setResponseHeader(event, 'Cache-Control', 'no-store')
  const { adminPassword, supabaseUrl, supabaseSecretKey } = useRuntimeConfig(event)
  if (!adminPassword || !supabaseSecretKey) {
    throw createError({ statusCode: 503, statusMessage: 'Admin unavailable' })
  }
  const authorization = getHeader(event, 'authorization') || ''
  if (!timingSafeEqual(hash(authorization), hash('Bearer ' + adminPassword))) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid admin password' })
  }
  return { supabaseUrl, supabaseSecretKey }
}
