export default defineEventHandler(async (event) => {
  const { token } = await readBody<{ token?: string }>(event)
  if (typeof token !== 'string' || !token || token.length > 8192) {
    throw createError({ statusCode: 400, statusMessage: 'Missing LINE token' })
  }
  await verifyLine(event, token)
  setCookie(event, 'nocap_line', token, { httpOnly: true, sameSite: 'lax', secure: !import.meta.dev, path: '/', maxAge: 3600 })
  return { ok: true }
})
