import { randomInt } from 'node:crypto'
import type { H3Event } from 'h3'
import prizes from '../../public/redemption/items.json'

type LineProfile = {
  user_name: string | null
}
type Draw = Partial<LineProfile> & { prize_id: string; redeemed_at: string | null }
const repeatDrawUsers = new Set([
  'Uf839f8223325f0b5f530e988874b747f',
  'Ude606b54d8b161a1b1edde18f2569a48',
])
export const eventId = 'nocap-grand-opening-2026'
let mockDraw: Draw | undefined

export function isMock(event: H3Event) {
  return String(useRuntimeConfig(event).public.liffMock) === 'true'
}

export async function verifyLine(event: H3Event, token: string) {
  const config = useRuntimeConfig(event)
  try {
    const identity = await $fetch<{ sub: string; name?: string }>('https://api.line.me/oauth2/v2.1/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ id_token: token, client_id: String(config.lineChannelId).trim() }),
      timeout: 5000,
    })
    if (!identity.sub) throw new Error('Missing subject')
    const profile: LineProfile = {
      user_name: identity.name?.trim() || null,
    }
    return { userId: identity.sub, profile }
  } catch (error) {
    const failure = error as { statusCode?: number; data?: { error_description?: string } }
    const description = failure.data?.error_description
    const reason = description === 'IdToken expired.' ? 'LINE_TOKEN_EXPIRED'
      : description === 'Invalid IdToken Audience.' ? 'LINE_CHANNEL_MISMATCH'
      : failure.statusCode === 400 || failure.statusCode === 401 ? 'LINE_TOKEN_INVALID'
      : 'LINE_VERIFY_UNAVAILABLE'
    throw createError({
      statusCode: reason === 'LINE_VERIFY_UNAVAILABLE' ? 502 : 401,
      statusMessage: reason,
      data: { reason },
    })
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

export async function eventDraw(event: H3Event, action: 'draw' | 'redraw' | 'status' | 'redeem') {
  setResponseHeader(event, 'Cache-Control', 'no-store')
  if (isMock(event)) {
    if (action === 'draw') mockDraw ??= { user_name: null, prize_id: choosePrize(), redeemed_at: null }
    if (action === 'redeem' && mockDraw) mockDraw.redeemed_at ??= new Date().toISOString()
    return mockDraw
  }

  const token = getCookie(event, 'nocap_line')
  if (!token) throw createError({ statusCode: 401, statusMessage: 'LINE login required' })
  const { userId, profile } = await verifyLine(event, token)
  const allowRepeatDraws = String(useRuntimeConfig(event).allowRepeatDraws) === 'true'
  event.context.canRedraw = allowRepeatDraws || repeatDrawUsers.has(userId)
  if (action === 'redraw' && !event.context.canRedraw) {
    throw createError({ statusCode: 403, statusMessage: 'Repeat drawing not permitted' })
  }
  const { supabaseUrl, supabaseSecretKey } = useRuntimeConfig(event)
  if (!supabaseSecretKey) throw createError({ statusCode: 503, statusMessage: 'Prize storage unavailable' })
  const url = new URL('/rest/v1/event_draws', supabaseUrl)
  const sourceOrigin = getRequestURL(event).origin
  const headers = { apikey: supabaseSecretKey }
  const filter = { event_id: 'eq.' + eventId, line_user_id: 'eq.' + userId }
  const select = action === 'draw' ? 'prize_id,redeemed_at,user_name' : 'prize_id,redeemed_at'

  try {
    if (action === 'redraw') {
      const [draw] = await $fetch<Draw[]>(new URL('/rest/v1/rpc/redraw_event_prize', supabaseUrl).href, {
        method: 'POST',
        headers,
        body: {
          p_event_id: eventId, p_user_id: userId,
          p_user_name: profile.user_name, p_prize_id: choosePrize(), p_source_origin: sourceOrigin,
        },
      })
      return draw
    }
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
        body: { event_id: eventId, line_user_id: userId, ...profile, source_origin: sourceOrigin, prize_id: choosePrize() },
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
