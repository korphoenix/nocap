import { timingSafeEqual, createHash } from 'node:crypto'

export default defineEventHandler(async event => {
  const expected = useRuntimeConfig(event).redemptionPin
  if (!expected) throw createError({ statusCode: 503, statusMessage: 'Redemption unavailable' })
  const { pin } = await readBody<{ pin?: string }>(event)
  const digest = (value: string) => createHash('sha256').update(value).digest()
  if (typeof pin !== 'string' || !timingSafeEqual(digest(pin), digest(expected))) {
    throw createError({ statusCode: 403, statusMessage: 'Invalid redemption password' })
  }
  const draw = await eventDraw(event, 'redeem')
  if (!draw?.redeemed_at) throw createError({ statusCode: 404, statusMessage: 'Draw not found' })
  return { redeemed: true, redeemedAt: draw.redeemed_at }
})
