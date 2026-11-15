<script setup lang="ts">
import poster from '../poster-layers.json'

const baseURL = useRuntimeConfig().app.baseURL
const asset = (path: string) => baseURL + path
const [width = 801, height = 1900] = poster.canvas
const dialog = ref<HTMLDialogElement>()
const frame = ref<HTMLIFrameElement>()
const frameURL = ref('')
const scale = ref(1)
const loading = ref(false)
const prizeError = ref(false)

function layerStyle(layer: (typeof poster.layers)[number]) {
  return {
    left: `${layer.x / width * 100}%`,
    top: `${layer.y / height * 100}%`,
    width: `${layer.width / width * 100}%`,
    height: `${layer.height / height * 100}%`,
    zIndex: layer.z,
  }
}

function resizePrize() {
  if (dialog.value?.open) scale.value = dialog.value.clientWidth / 793
}

async function openPrize() {
  if (loading.value || !dialog.value) return
  loading.value = true
  prizeError.value = false

  try {
    if (!frameURL.value) {
      const prizes = await $fetch<{ id: string }[]>(asset('redemption/items.json'))
      const prize = prizes[Math.floor(Math.random() * prizes.length)]
      if (!prize) throw new Error('No prizes found')
      const query = new URLSearchParams({ prize: prize.id, paper: '1' })
      frameURL.value = asset(`redemption/result.html?${query}`)
    }

    dialog.value.showModal()
    resizePrize()
  } catch {
    prizeError.value = true
  } finally {
    loading.value = false
  }
}

function closePrize() {
  dialog.value?.close()
}

function onPrizeMessage(event: MessageEvent) {
  if (event.origin === location.origin && event.source === frame.value?.contentWindow && event.data === 'close-result') {
    closePrize()
  }
}

onMounted(() => {
  window.addEventListener('resize', resizePrize)
  window.addEventListener('message', onPrizeMessage)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizePrize)
  window.removeEventListener('message', onPrizeMessage)
})
</script>

<template>
  <main class="poster" aria-label="NOCAP Open Frequency 活動海報">
    <img
      v-for="layer in poster.layers"
      :key="layer.name"
      class="piece"
      :class="{ photo: layer.name.startsWith('photo_') }"
      :src="asset(layer.file)"
      :style="layerStyle(layer)"
      alt=""
    >
    <button
      class="unlock"
      type="button"
      aria-label="解鎖今晚的驚喜"
      aria-haspopup="dialog"
      :disabled="loading"
      @click="openPrize"
    />
  </main>

  <p v-if="prizeError" class="prize-error" role="alert">暫時無法載入獎品，請再試一次。</p>

  <dialog ref="dialog" class="prize-dialog" aria-label="今晚的驚喜">
    <iframe
      v-if="frameURL"
      ref="frame"
      class="prize-frame"
      :src="frameURL"
      :style="{ transform: `scale(${scale})` }"
      title="獎品與兌換畫面"
    />
    <button class="close-prize" type="button" aria-label="關閉獎品彈窗" @click="closePrize">×</button>
  </dialog>
</template>

<style>
body { margin: 0; background: #202020; }
.poster { position: relative; width: min(801px, 100%); aspect-ratio: 801 / 1900; margin: auto; isolation: isolate; overflow: hidden; }
.piece { position: absolute; display: block; }
.photo { object-fit: cover; }
.unlock { position: absolute; left: 12.23%; top: 38%; width: 76.03%; height: 5.42%; z-index: 100; border: 0; border-radius: 24px; background: transparent; cursor: pointer; }
.unlock:focus-visible { outline: 3px solid white; outline-offset: 3px; }
.prize-dialog { box-sizing: border-box; width: min(96vw, calc(94dvh * 793 / 1210), 793px); max-width: none; max-height: none; aspect-ratio: 793 / 1210; padding: 0; border: 0; background: transparent; overflow: hidden; }
.prize-dialog::backdrop { background: #000b; }
.prize-frame { display: block; width: 793px; height: 1210px; border: 0; transform-origin: top left; }
.close-prize { position: absolute; top: 1%; right: 1%; border: 0; border-radius: 50%; width: 32px; height: 32px; background: #202020; color: white; cursor: pointer; }
.prize-error { position: fixed; bottom: 12px; left: 12px; z-index: 100; background: white; padding: 8px; }
</style>
