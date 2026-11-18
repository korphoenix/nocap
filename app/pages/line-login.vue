<script setup lang="ts">
useHead({ title: 'NOCAP｜LINE 登入' })

const config = useRuntimeConfig()
const failed = ref(false)

onMounted(async () => {
  if (String(config.public.liffMock) === 'true') {
    await navigateTo('/', { replace: true })
    return
  }

  try {
    const liffId = config.public.liffId.trim()
    if (!liffId) throw new Error('Missing LIFF ID')
    const { default: liff } = await import('@line/liff')
    await liff.init({ liffId, withLoginOnExternalBrowser: true })
    if (!liff.isLoggedIn()) return

    const token = liff.getIDToken()
    if (!token) throw new Error('Missing LINE ID token')
    await $fetch(config.app.baseURL + 'api/line/session', { method: 'POST', body: { token } })
    await navigateTo('/', { replace: true })
  } catch {
    failed.value = true
  }
})
</script>

<template>
  <main class="line-login">
    <p v-if="failed" role="alert">暫時無法完成 LINE 登入，請重新開啟活動連結。</p>
  </main>
</template>

<style scoped>
.line-login {
  position: fixed;
  inset: 0;
  display: grid;
  place-content: center;
  padding: 24px;
  background: #202020;
  color: white;
  font-family: system-ui, sans-serif;
}
</style>
