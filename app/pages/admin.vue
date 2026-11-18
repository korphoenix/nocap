<script setup lang="ts">
useSeoMeta({ title: 'NOCAP 活動後台', robots: 'noindex, nofollow' })

type RecordRow = {
  line_user_id: string
  user_name: string | null
  prizeName: string
  first_login_at: string | null
  drawn_at: string
  redeemed_at: string | null
}
type DrawList = { rows: RecordRow[]; total: number; pageSize: number }

const { app } = useRuntimeConfig()
const password = ref('')
const credential = ref('')
const records = ref<DrawList>()
const loading = ref(false)
const error = ref('')
const filter = ref('all')
const showReset = ref(false)
const confirmation = ref('')
const resetting = ref(false)
const notice = ref('')
const resetPhrase = '清除本次活動'

const page = ref(1)
const dateFormat = new Intl.DateTimeFormat('zh-TW', {
  timeZone: 'Asia/Taipei', dateStyle: 'medium', timeStyle: 'short',
})

async function load(target = 1) {
  if (loading.value || resetting.value) return
  const secret = credential.value || password.value
  if (!secret) return
  loading.value = true
  error.value = ''
  try {
    records.value = await $fetch<DrawList>(app.baseURL + 'api/admin/draws', {
      headers: { Authorization: 'Bearer ' + secret },
      query: { page: target, status: filter.value },
    })
    credential.value = secret
    password.value = ''
    page.value = target
  } catch (cause) {
    const status = (cause as { statusCode?: number }).statusCode
    if (status === 401) logout()
    error.value = status === 401 ? '管理密碼不正確。' : '目前無法讀取資料，請稍後再試。'
  } finally {
    loading.value = false
  }
}

async function clearDraws() {
  if (resetting.value || loading.value || confirmation.value !== resetPhrase) return
  resetting.value = true
  error.value = ''
  notice.value = ''
  try {
    await $fetch(app.baseURL + 'api/admin/draws', {
      method: 'DELETE',
      headers: { Authorization: 'Bearer ' + credential.value },
      body: { confirmation: confirmation.value },
    })
    showReset.value = false
    confirmation.value = ''
    filter.value = 'all'
    page.value = 1
    records.value = { rows: [], total: 0, pageSize: records.value?.pageSize ?? 50 }
    notice.value = '本次活動紀錄已清除。'
  } catch (cause) {
    if ((cause as { statusCode?: number }).statusCode === 401) logout()
    error.value = '無法確認清除結果，請重新查詢紀錄。'
  } finally {
    resetting.value = false
  }
  if (notice.value) await load()
}

function logout() {
  showReset.value = false
  confirmation.value = ''
  notice.value = ''
  credential.value = ''
  password.value = ''
  records.value = undefined
  filter.value = 'all'
  page.value = 1
  error.value = ''
}
</script>

<template>
  <main class="admin">
    <header>
      <h1>NOCAP 活動後台</h1>
      <button v-if="records" :disabled="loading || resetting" @click="logout">登出</button>
    </header>

    <p v-if="notice" role="status">{{ notice }}</p>
    <p v-if="error" role="alert">{{ error }}</p>
    <form v-if="!records" @submit.prevent="load()">
      <label for="admin-password">管理密碼</label>
      <input id="admin-password" v-model="password" autocomplete="current-password" type="password" required>
      <button :disabled="loading">{{ loading ? '驗證中…' : '登入' }}</button>
    </form>

    <section v-else :aria-busy="loading">
      <div class="toolbar">
        <label>核銷狀態
          <select v-model="filter" :disabled="loading" @change="load()">
            <option value="all">全部</option>
            <option value="pending">未核銷</option>
            <option value="redeemed">已核銷</option>
          </select>
        </label>
        <button :disabled="loading" @click="load(page)">重新整理</button>
        <span>{{ records.total }} 筆</span>
      </div>
      <p v-if="!records.rows.length">目前沒有符合條件的紀錄。</p>
      <div v-else class="table-scroll">
        <table>
          <thead><tr><th scope="col">LINE 使用者</th><th scope="col">獎品</th><th scope="col">首次 LINE 登入</th><th scope="col">抽獎時間</th><th scope="col">核銷狀態</th></tr></thead>
          <tbody>
            <tr v-for="row in records.rows" :key="row.line_user_id">
              <td>{{ row.user_name || '未提供名稱' }}<small>{{ row.line_user_id }}</small></td>
              <td>{{ row.prizeName }}</td>
              <td>{{ row.first_login_at ? dateFormat.format(new Date(row.first_login_at)) : '未記錄' }}</td>
              <td>{{ dateFormat.format(new Date(row.drawn_at)) }}</td>
              <td>
                {{ row.redeemed_at ? '已核銷' : '未核銷' }}
                <small v-if="row.redeemed_at">{{ dateFormat.format(new Date(row.redeemed_at)) }}</small>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <nav v-if="page > 1 || records.total > records.pageSize" aria-label="抽獎紀錄分頁">
        <button :disabled="loading || page === 1" @click="load(page - 1)">上一頁</button>
        <span>第 {{ page }} 頁</span>
        <button :disabled="loading || page * records.pageSize >= records.total" @click="load(page + 1)">下一頁</button>
      </nav>
      <div class="reset-area">
        <button v-if="!showReset" class="danger" :disabled="loading || resetting" @click="showReset = true">
          清除本次活動紀錄
        </button>
        <template v-else>
          <p>這會永久刪除本次活動的所有抽獎和核銷紀錄（包含其他分頁）。清除後，使用者再次進入活動頁會重新抽獎。</p>
          <form @submit.prevent="clearDraws">
            <label for="reset-confirmation">請輸入「{{ resetPhrase }}」</label>
            <input id="reset-confirmation" v-model="confirmation" :disabled="resetting" autocomplete="off">
            <button class="danger" :disabled="loading || resetting || confirmation !== resetPhrase">
              {{ resetting ? '清除中…' : '永久清除' }}
            </button>
            <button type="button" :disabled="resetting" @click="showReset = false; confirmation = ''">取消</button>
          </form>
        </template>
      </div>
    </section>
  </main>
</template>

<style scoped>
.admin { min-height: 100dvh; box-sizing: border-box; padding: clamp(20px, 5vw, 64px); background: #f3f3f9; color: #15183c; font-family: system-ui, sans-serif; }
header, .toolbar, nav, form { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; }
header { justify-content: space-between; margin-bottom: 20px; }
h1 { margin: 0; font-size: clamp(24px, 5vw, 38px); }
button, input, select { font: inherit; border: 1px solid #a6abd0; border-radius: 6px; padding: 8px 12px; background: white; color: inherit; }
button { background: #18278a; color: white; cursor: pointer; }
button:disabled { opacity: .5; cursor: default; }
.table-scroll { overflow-x: auto; margin-top: 16px; }
table { width: 100%; min-width: 620px; border-collapse: collapse; background: white; text-align: left; }
th, td { padding: 12px; border-bottom: 1px solid #dde0ed; }
th { background: #e5e8fa; }
small { display: block; margin-top: 3px; color: #555c77; overflow-wrap: anywhere; }
nav { margin-top: 16px; }
.reset-area { margin-top: 32px; padding-top: 16px; border-top: 1px solid #dde0ed; }
.danger { background: #a51e3c; border-color: #a51e3c; }
[role="alert"] { color: #a51e3c; }
</style>
