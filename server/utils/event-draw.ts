import { randomInt } from 'node:crypto'
import type { H3Event } from 'h3'
import prizes from '../../public/redemption/items.json'

type LineProfile = {
  user_name: string | null
}
type Draw = Partial<LineProfile> & { prize_id: string; redeemed_at: string | null }
const eventId = 'nocap-grand-opening-2026'
let mockDraw: Draw | undefined

export function isMock(event: H3Event) {
  return String(useRuntimeConfig(event).public.liffMock) === 'true'
}

export async function verifyLine(event: H3Event, token: string) {
  const config = useRuntimeConfig(event)
  try {
    const identity = await $fetch<{ sub: string; name?: string }>('https://api.line.me/oauth2/v2.1/verify', {
      method: 'POST',
      body: new URLSearchParams({ id_token: token, client_id: config.lineChannelId }),
      timeout: 5000,
    })
    if (!identity.sub) throw new Error('Missing subject')
    const profile: LineProfile = {
      user_name: identity.name?.trim() || null,
    }
    return { userId: identity.sub, profile }
  } catch {
    throw createError({ statusCode: 401, statusMessage: 'LINE login required' })
  }
}

function choosePrize() {
  const total = prizes.reduce((sum, prize) => sum + prize.chancePercent, 0)
  if (total !== 100 || prizes.some(p => !Number.isInteger(p.chancePercent) || p.chancePercent < 0)) {
    throw createError({ statusCode: 500, statusMessage: 'Invalid prize weights' })
  }
  let ticket = randomInt(total)
  return prizes.find(prize => (ticket -= prize.chancePercent) < 0)!.id
}

export async function eventDraw(event: H3Event, action: 'draw' | 'status' | 'redeem') {
  setResponseHeader(event, 'Cache-Control', 'no-store')
  if (isMock(event)) {
    if (action === 'draw') mockDraw ??= { user_name: null, prize_id: choosePrize(), redeemed_at: null }
    if (action === 'redeem' && mockDraw) mockDraw.redeemed_at ??= new Date().toISOString()
    return mockDraw
  }

  const token = getCookie(event, 'nocap_line')
  if (!token) throw createError({ statusCode: 401, statusMessage: 'LINE login required' })
  const { userId, profile } = await verifyLine(event, token)
  const { supabaseUrl, supabaseSecretKey } = useRuntimeConfig(event)
  if (!supabaseSecretKey) throw createError({ statusCode: 503, statusMessage: 'Prize storage unavailable' })
  const url = new URL('/rest/v1/event_draws', supabaseUrl)
  const headers = { apikey: supabaseSecretKey }
  const filter = { event_id: 'eq.' + eventId, line_user_id: 'eq.' + userId }
  const select = action === 'draw' ? 'prize_id,redeemed_at,user_name' : 'prize_id,redeemed_at'

  try {
    if (action === 'draw') {
      const [existing] = await $fetch<Draw[]>(url.href, { headers, query: { ...filter, select } })
      if (existing) {
        const updates = Object.fromEntries(
          (Object.keys(profile) as (keyof LineProfile)[])
            .filter(key => profile[key] !== null && profile[key] !== existing[key])
            .map(key => [key, profile[key]]),
        )
        if (Object.keys(updates).length) {
          await $fetch(url.href, {
            method: 'PATCH',
            headers,
            query: filter,
            body: updates,
          })
        }
        return existing
      }
      await $fetch(url.href, {
        method: 'POST',
        headers: { ...headers, Prefer: 'resolution=ignore-duplicates,return=minimal' },
        body: { event_id: eventId, line_user_id: userId, ...profile, prize_id: choosePrize() },
      })
    }

    if (action === 'redeem') {
      await $fetch(url.href, {
        method: 'PATCH',
        headers,
        query: { ...filter, redeemed_at: 'is.null' },
        body: { redeemed_at: new Date().toISOString() },
      })
    }

    const [draw] = await $fetch<Draw[]>(url.href, { headers, query: { ...filter, select } })
    return draw
  } catch {
    throw createError({ statusCode: 503, statusMessage: 'Prize storage unavailable' })
  }
}
