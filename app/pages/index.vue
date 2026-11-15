<script setup lang="ts">
useHead({ title: 'LINE LIFF 測試' })

const config = useRuntimeConfig()
const liffId = config.public.liffId.trim()
const mockEnabled = String(config.public.liffMock) === 'true'
const profile = ref<{ userId: string; pictureUrl?: string }>(mockEnabled ? {
  userId: 'U00000000000000000000000000000000',
  pictureUrl: config.app.baseURL + 'assets/line-mock-avatar.png',
} : undefined)
const status = ref<'loading' | 'login' | 'missing' | 'error' | 'ready'>(
  mockEnabled ? 'ready' : liffId ? 'loading' : 'missing',
)
let login: (() => void) | undefined

onMounted(async () => {
  if (mockEnabled || !liffId) return

  try {
    const { default: liff } = await import('@line/liff')
    await liff.init({ liffId })
    if (!liff.isLoggedIn()) {
      login = () => liff.login()
      status.value = 'login'
      return
    }

    const { userId, pictureUrl } = await liff.getProfile()
    profile.value = { userId, pictureUrl }
    status.value = 'ready'
  } catch {
    status.value = 'error'
  }
})
</script>

<template>
  <main class="liff-test" aria-live="polite">
    <template v-if="profile">
      <img v-if="profile.pictureUrl" :src="profile.pictureUrl" alt="LINE 大頭照" width="112" height="112" referrerpolicy="no-referrer">
      <p v-else>此帳號沒有設定大頭照</p>
      <dl>
        <dt>{{ mockEnabled ? 'LINE 使用者 ID（測試）' : 'LINE 使用者 ID' }}</dt>
        <dd>{{ profile.userId }}</dd>
      </dl>
    </template>
    <button v-else-if="status === 'login'" type="button" @click="login?.()">使用 LINE 登入</button>
    <p v-else-if="status === 'missing'">尚未設定 LIFF ID。</p>
    <p v-else-if="status === 'error'">無法取得 LINE 個人資料，請確認 LIFF 設定與 profile 權限後重新開啟。</p>
    <p v-else>正在讀取 LINE 個人資料…</p>
  </main>
</template>

<style scoped>
.liff-test { position: fixed; inset: 0; display: grid; place-content: center; justify-items: center; padding: 24px; background: #fff; color: #151515; text-align: center; font-family: system-ui, sans-serif; }
img { border-radius: 50%; object-fit: cover; }
dl { max-width: 100%; }
dd { margin: 6px 0 0; overflow-wrap: anywhere; }
button { padding: 12px 20px; border: 0; border-radius: 8px; background: #06a449; color: white; font: inherit; cursor: pointer; }
</style>
