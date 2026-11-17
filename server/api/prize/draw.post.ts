export default defineEventHandler(async event => {
  const draw = await eventDraw(event, 'draw')
  if (!draw) throw createError({ statusCode: 503, statusMessage: 'Draw unavailable' })
  return { prizeId: draw.prize_id, redeemed: Boolean(draw.redeemed_at) }
})
