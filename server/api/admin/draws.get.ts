import prizes from '../../../public/redemption/items.json'

const pageSize = 50

type Draw = {
  record_id: string
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
    const response = await $fetch.raw<Draw[]>(new URL('/rest/v1/admin_event_draws', supabaseUrl).href, {
      headers: { apikey: supabaseSecretKey, Prefer: 'count=exact' },
      query: {
        event_id: 'eq.' + eventId,
        select: 'record_id,line_user_id,user_name,prize_id,drawn_at,redeemed_at',
        order: 'drawn_at.desc,record_id.asc',
        limit: pageSize,
        offset: (page - 1) * pageSize,
        ...(query.status === 'redeemed' ? { redeemed_at: 'not.is.null' } :
          query.status === 'pending' ? { redeemed_at: 'is.null' } : {}),
      },
      timeout: 8000,
    })
    const draws = response._data ?? []
    const users = draws.length ? await $fetch<{ line_user_id: string; first_login_at: string }[]>(
      new URL('/rest/v1/line_users', supabaseUrl).href, {
        headers: { apikey: supabaseSecretKey },
        query: { select: 'line_user_id,first_login_at', line_user_id: 'in.(' + draws.map(row => row.line_user_id).join(',') + ')' },
        timeout: 8000,
      },
    ) : []
    const rows = draws.map(row => ({
      first_login_at: users.find(user => user.line_user_id === row.line_user_id)?.first_login_at ?? null,
      ...row,
      prizeName: prizes.find(prize => prize.id === row.prize_id)?.name ?? row.prize_id,
    }))
    return { rows, total: Number(response.headers.get('content-range')?.split('/')[1] ?? rows.length), pageSize }
  } catch (error) {
    if ((error as { statusCode?: number }).statusCode === 416) return { rows: [], total: 0, pageSize }
    throw createError({ statusCode: 502, statusMessage: 'Could not load draw records' })
  }
})
