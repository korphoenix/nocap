export default defineEventHandler(async (event) => {
  const { token } = await readBody<{ token?: string }>(event)
  if (typeof token !== 'string' || !token || token.length > 8192) {
    throw createError({ statusCode: 400, statusMessage: 'Missing LINE token' })
  }
  const { userId } = await verifyLine(event, token)
  const { supabaseUrl, supabaseSecretKey } = useRuntimeConfig(event)
  if (!supabaseSecretKey) throw createError({ statusCode: 503, statusMessage: 'Login storage unavailable' })
  await $fetch(new URL('/rest/v1/line_users', supabaseUrl).href, {
    method: 'POST',
    headers: { apikey: supabaseSecretKey, Prefer: 'resolution=ignore-duplicates,return=minimal' },
    body: { line_user_id: userId },
    timeout: 8000,
  })
  setCookie(event, 'nocap_line', token, { httpOnly: true, sameSite: 'lax', secure: !import.meta.dev, path: '/', maxAge: 3600 })
  return { ok: true }
})
