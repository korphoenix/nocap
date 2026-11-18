export default defineEventHandler(async (event) => {
  const { supabaseUrl, supabaseSecretKey } = requireAdmin(event)
  const body = await readBody<{ confirmation?: string }>(event)
  if (body?.confirmation !== '清除本次活動') {
    throw createError({ statusCode: 400, statusMessage: 'Confirmation required' })
  }

  try {
    await $fetch(new URL('/rest/v1/rpc/clear_event_draws', supabaseUrl).href, {
      method: 'POST',
      headers: { apikey: supabaseSecretKey },
      body: { p_event_id: eventId },
      timeout: 8000,
    })
    return { ok: true }
  } catch {
    throw createError({ statusCode: 502, statusMessage: 'Could not clear draw records' })
  }
})
