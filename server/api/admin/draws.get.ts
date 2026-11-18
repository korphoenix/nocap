import prizes from '../../../public/redemption/items.json'

const pageSize = 50

type Draw = {
  line_user_id: string
  user_name: string | null
  prize_id: string
  drawn_at: string
  redeemed_at: string | null
}

export default defineEventHandler(async (event) => {
  const { supabaseUrl, supabaseSecretKey } = requireAdmin(event)

  const query = getQuery(event)
  const page = Number(query.page ?? 1)
  if (!Number.isSafeInteger(page) || page < 1 || page > 100000) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid page' })
  }

  try {
    const response = await $fetch.raw<Draw[]>(new URL('/rest/v1/event_draws', supabaseUrl).href, {
      headers: { apikey: supabaseSecretKey, Prefer: 'count=exact' },
      query: {
        event_id: 'eq.' + eventId,
        select: 'line_user_id,user_name,prize_id,drawn_at,redeemed_at',
        order: 'drawn_at.desc,line_user_id.asc',
        limit: pageSize,
        offset: (page - 1) * pageSize,
        ...(query.status === 'redeemed' ? { redeemed_at: 'not.is.null' } :
          query.status === 'pending' ? { redeemed_at: 'is.null' } : {}),
      },
      timeout: 8000,
    })
    const rows = (response._data ?? []).map(row => ({
      ...row,
      prizeName: prizes.find(prize => prize.id === row.prize_id)?.name ?? row.prize_id,
    }))
    return { rows, total: Number(response.headers.get('content-range')?.split('/')[1] ?? rows.length), pageSize }
  } catch (error) {
    if ((error as { statusCode?: number }).statusCode === 416) return { rows: [], total: 0, pageSize }
    throw createError({ statusCode: 502, statusMessage: 'Could not load draw records' })
  }
})
