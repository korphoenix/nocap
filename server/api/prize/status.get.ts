export default defineEventHandler(async event => {
  const draw = await eventDraw(event, 'status')
  return { drawn: Boolean(draw), redeemed: Boolean(draw?.redeemed_at), redeemedAt: draw?.redeemed_at ?? null }
})
