export default defineEventHandler(async event => {
  const body = await readBody<{ redraw?: boolean }>(event)
  const draw = await eventDraw(event, body?.redraw === true ? 'redraw' : 'draw')
  if (!draw) throw createError({ statusCode: 503, statusMessage: 'Draw unavailable' })
  return { prizeId: draw.prize_id, redeemed: Boolean(draw.redeemed_at), canRedraw: event.context.canRedraw === true }
})
