<script setup lang="ts">
import { gsap } from 'gsap'
import poster from '../poster-layers.json'

const title = 'NOCAP OPEN FREQUENCY｜11/21 開幕'
const description = '11/21，NOCAP 在 MAJI・TAIPEI 開幕。到現場掃碼，解鎖你的開幕驚喜。獎品限現場兌換。'

const image = 'https://nocap-grand-opening.vercel.app/assets/nocap-og-logo.png'
const imageAlt = 'NOCAP Logo'

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogImage: image,
  ogImageAlt: imageAlt,
  ogImageWidth: 1200,
  ogImageHeight: 630,
  twitterCard: 'summary_large_image',
  twitterImage: image,
  twitterImageAlt: imageAlt,
  twitterTitle: title,
  twitterDescription: description,
})

const baseURL = useRuntimeConfig().app.baseURL
const asset = (path: string) => baseURL + path
const [width = 801, height = 1900] = poster.canvas
const posterElement = ref<HTMLElement>()
const dialog = ref<HTMLDialogElement>()
const resultMounted = ref(false)
const resultActive = ref(false)
let resultResolve: (() => void) | undefined
let resultReject: (() => void) | undefined
const scale = ref(1)
const loading = ref(false)
const prizeId = ref('')
const imagesReady = ref(false)
let disposed = false
const redeemed = ref(false)
const canRedraw = ref(false)
const openingPrize = ref(false)
const prizeError = ref(false)
const entryError = ref('')
const posterLinks = [
  { label: '追蹤 NOCAP IG', href: 'https://www.instagram.com/nocap_taipei', x: 130, y: 858, w: 541, h: 69 },
  { label: '在 Spotify 播放 Vibes', href: 'https://open.spotify.com/playlist/7ohRWKojfu3YCK6A3Eb3e6?si=cbb862bda99843c6', x: 33, y: 1305, w: 736, h: 119 },
  { label: '在 Spotify 播放 Groove', href: 'https://open.spotify.com/playlist/0hUMGWa68qX8hGWQ9ZCI9k?si=6aae697b69d04bd1', x: 33, y: 1454, w: 736, h: 119 },
  { label: '在 Spotify 播放 Hyped', href: 'https://open.spotify.com/playlist/4kQIFpLReWyB3fGIIocikm?si=032d321153fc4680', x: 33, y: 1605, w: 736, h: 119 },
]
let entrance: ReturnType<typeof gsap.context> | undefined
let prizeTween: ReturnType<typeof gsap.fromTo> | undefined
let sectionObserver: IntersectionObserver | undefined

function motionAllowed() {
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function entranceGroup(layer: (typeof poster.layers)[number]) {
  const name = layer.name
  if (name === 'background') return undefined
  if (name === 'photo_top') return 'hero-photo'
  if (name === 'photo_footer') return 'footer-photo'
  if (/^(open_|frequency_)/.test(name)) return 'title'
  if (/^(hand|cable|carabiner)/.test(name)) return 'collage'
  if (name.startsWith('logo')) return 'logo'
  if (/^(event_|grand_opening)/.test(name)) return 'date'
  if (/^(vibes|groove|hyped)_/.test(name)) return name.split('_')[0]
  if (layer.y < 580) return 'hero'
  if (layer.y < 1040) return 'instructions'
  return 'playlists'
}

function animatePrize(element: HTMLDialogElement) {
  prizeTween?.kill()
  if (!motionAllowed()) return

  prizeTween = gsap.fromTo(element,
    { opacity: 0 },
    { opacity: 1, duration: 0.28, ease: 'power2.out', clearProps: 'opacity' },
  )
}

function layerStyle(layer: (typeof poster.layers)[number]) {
  return {
    left: `${layer.x / width * 100}%`,
    top: `${layer.y / height * 100}%`,
    width: `${layer.width / width * 100}%`,
    height: `${layer.height / height * 100}%`,
    zIndex: layer.z,
    ...(['open_text', 'frequency_text'].includes(layer.name) ? {
      maskImage: `url("${asset(layer.file.replace(/\.(png|webp)$/, '-mask.svg'))}")`,
      maskSize: '100% 100%',
      maskRepeat: 'no-repeat',
    } : {}),
  }
}

function resizePrize() {
  if (!dialog.value?.open) return
  const viewport = window.visualViewport
  const availableWidth = viewport?.width ?? window.innerWidth
  const availableHeight = viewport?.height ?? window.innerHeight
  scale.value = Math.min((availableWidth - 24) / 793, (availableHeight - 24) / 1210, 1)
  Object.assign(dialog.value.style, {
    width: `${793 * scale.value}px`,
    height: `${1210 * scale.value}px`,
    left: `${(viewport?.offsetLeft ?? 0) + availableWidth / 2}px`,
    top: `${(viewport?.offsetTop ?? 0) + availableHeight / 2}px`,
  })
}

async function openPrize() {
  if (openingPrize.value || !prizeId.value || !dialog.value) return
  openingPrize.value = true
  prizeError.value = false
  loading.value = canRedraw.value || !redeemed.value

  try {
    if (canRedraw.value) {
      const draw = await $fetch<{ prizeId: string; redeemed: boolean }>(asset('api/prize/draw'), {
        method: 'POST', body: { redraw: true },
      })
      prizeId.value = draw.prizeId
      redeemed.value = draw.redeemed
    }
    if (loading.value) {
      await new Promise<void>(resolve => setTimeout(resolve, motionAllowed() ? 780 : 120))
    }
    if (!dialog.value) return

    const ready = new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Prize loading timed out')), 20000)
      resultResolve = () => { clearTimeout(timeout); resolve() }
      resultReject = () => { clearTimeout(timeout); reject(new Error('Prize loading failed')) }
    })
    resultMounted.value = true
    await ready
    if (!dialog.value || disposed) return
    prizeTween?.kill()
    dialog.value.style.opacity = '0'
    dialog.value.showModal()
    resizePrize()
    await nextTick()
    // Let the mobile browser commit the final popup bounds before revealing it.
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
    if (disposed || !dialog.value?.open) return
    resultActive.value = true
    if (motionAllowed()) animatePrize(dialog.value)
    else dialog.value.style.opacity = '1'
  } catch {
    resetResult()
    prizeError.value = true
  } finally {
    loading.value = false
    openingPrize.value = false
  }
}

function closePrize() {
  dialog.value?.close()
}

function resetResult() {
  resultMounted.value = false
  resultActive.value = false
  resultResolve = undefined
  resultReject = undefined
}

async function prepareDraw() {
  let stage = 'LINE 初始化'
  try {
    if (String(useRuntimeConfig().public.liffMock) !== 'true') {
      const liffId = useRuntimeConfig().public.liffId.trim()
      if (!liffId) throw new Error('Missing LIFF ID')
      const { default: liff } = await import('@line/liff')
      // Complete the LIFF callback at its original endpoint before changing URLs.
      await liff.init({ liffId, withLoginOnExternalBrowser: true })
      if (!liff.isLoggedIn()) return
      stage = 'LINE 身分憑證'
      const token = liff.getIDToken()
      if (!token) throw new Error('Missing LINE ID token')
      stage = 'LINE 後端登入'
      await $fetch(asset('api/line/session'), { method: 'POST', body: { token } })
    }

    stage = '獎品紀錄讀取'
    const draw = await $fetch<{ prizeId: string; redeemed: boolean; canRedraw: boolean }>(asset('api/prize/draw'), { method: 'POST' })
    canRedraw.value = draw.canRedraw
    redeemed.value = draw.redeemed
    prizeId.value = draw.prizeId
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode
    entryError.value = `${stage}失敗${status ? '（' + status + '）' : ''}，請重新開啟活動連結。`
    prizeError.value = true
  }
}

onMounted(async () => {
  await prepareDraw()
  if (!prizeId.value) return
  await nextTick()
  window.addEventListener('resize', resizePrize)
  window.visualViewport?.addEventListener('resize', resizePrize)
  window.visualViewport?.addEventListener('scroll', resizePrize)

  const element = posterElement.value
  if (!element) return
  try {
    await Promise.all([
      ...Array.from(element.querySelectorAll('img'), image => image.decode()),
      document.fonts.ready,
    ])
  } catch {
    if (!disposed) {
      entryError.value = '活動圖片載入失敗，請重新整理頁面。'
      prizeError.value = true
    }
    return
  }
  if (disposed) return
  imagesReady.value = true
  if (!motionAllowed()) return
  entrance = gsap.context(() => {
    const timeline = gsap.timeline()
    timeline
      .fromTo('[data-entrance="hero"]', { opacity: 0 }, { opacity: 1, duration: 0.45 }, 0)
      .fromTo('[data-entrance="title"]', { opacity: 0, x: -24, y: 16 }, {
        opacity: 1, x: 0, y: 0, duration: 0.72, stagger: (_, target) => Number(target.dataset.enterStep || 0), ease: 'power3.out', clearProps: 'opacity,transform',
      }, 0.12)
      .fromTo('[data-entrance="collage"]', { opacity: 0, x: -9, y: 18 }, {
        opacity: 1, x: 0, y: 0, duration: 0.65, stagger: (_, target) => Number(target.dataset.enterStep || 0), ease: 'power3.out', clearProps: 'opacity,transform',
      }, 0.30)
      .fromTo('[data-entrance="logo"]', { opacity: 0, scale: 0.86 }, {
        opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.5)', clearProps: 'opacity,transform',
      }, 0.66)
      .fromTo('[data-entrance="date"]', { opacity: 0, y: 16 }, {
        opacity: 1, y: 0, duration: 0.48, ease: 'power3.out', clearProps: 'opacity,transform',
      }, 0.88)
      .fromTo('[data-entrance="hero-photo"]', { opacity: 0 }, { opacity: 1, duration: 0.6 }, 0.54)

    gsap.to('[data-sway="carabiner"]', {
      rotation: 1.8, transformOrigin: 'center center', duration: 2.1,
      delay: timeline.duration(), ease: 'sine.inOut', repeat: -1, yoyo: true,
    })
    gsap.to('[data-entrance="logo"]', {
      rotation: -0.9, y: -3, duration: 2.9,
      delay: timeline.duration() + 0.35, ease: 'sine.inOut', repeat: -1, yoyo: true,
    })

    gsap.to('[data-sway="hand"]', {
      rotation: 1.8, transformOrigin: '20% 88%', duration: 1.7,
      delay: timeline.duration() + 0.15, ease: 'sine.inOut', repeat: -1, yoyo: true,
    })
    gsap.to('[data-sway="cable"]', {
      rotation: -0.9, y: -2, transformOrigin: '8% 30%', duration: 2.3,
      delay: timeline.duration() + 0.3, ease: 'sine.inOut', repeat: -1, yoyo: true,
    })

    // Keep the motion subtle so the photos still read as background layers.
    const topPhoto = element.querySelector('.photo[data-entrance="hero-photo"]')
    if (topPhoto) {
      gsap.to(topPhoto, {
        rotation: -1.2, transformOrigin: 'right center', duration: 5,
        delay: timeline.duration(), ease: 'sine.inOut', repeat: -1, yoyo: true,
      })
    }

    const reveals = new Map<Element, ReturnType<typeof gsap.fromTo>>()
    sectionObserver = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        reveals.get(entry.target)?.play()
        sectionObserver?.unobserve(entry.target)
        reveals.delete(entry.target)
      }
    }, { rootMargin: '0px 0px 24px' })

    for (const marker of element.querySelectorAll<HTMLElement>('[data-reveal]')) {
      const layers = element.querySelectorAll(`[data-entrance="${marker.dataset.reveal}"]`)
      const drift = marker.dataset.reveal === 'footer-photo'
        ? gsap.to(layers, {
            rotation: 1.2, transformOrigin: 'right bottom', duration: 5,
            ease: 'sine.inOut', repeat: -1, yoyo: true, paused: true,
          })
        : undefined
      reveals.set(marker, gsap.fromTo(layers, { opacity: 0, y: 14 }, {
        opacity: 1, y: 0, duration: 0.52, ease: 'power2.out', clearProps: 'opacity,transform', paused: true,
        onComplete: () => { drift?.play() },
      }))
      sectionObserver.observe(marker)
    }
  }, element)
})

onBeforeUnmount(() => {
  disposed = true
  sectionObserver?.disconnect()
  entrance?.revert()
  prizeTween?.revert()
  window.removeEventListener('resize', resizePrize)
  window.visualViewport?.removeEventListener('resize', resizePrize)
  window.visualViewport?.removeEventListener('scroll', resizePrize)
})
</script>

<template>
  <div v-if="!imagesReady && !prizeError" class="page-loader" role="status" aria-label="載入活動中">
    <img :src="asset('assets/loading-logo.webp')" alt="" width="160" height="80" fetchpriority="high">
    <span class="loading-label" aria-hidden="true">Loading <span class="loading-dots"><span>.</span><span>.</span><span>.</span></span></span>
  </div>
  <main v-if="prizeId" ref="posterElement" class="poster" :class="{ 'poster-loading': !imagesReady }" :inert="!imagesReady" :aria-busy="!imagesReady" aria-label="NOCAP Open Frequency 活動海報">
    <span v-for="(group, y) in { 580: 'instructions', 1040: 'playlists', 1305: 'vibes', 1454: 'groove', 1605: 'hyped', 1719: 'footer-photo' }"
      :key="group" class="reveal-marker" :data-reveal="group" :style="{ top: `${Number(y) / height * 100}%` }" aria-hidden="true" />
    <img
      v-for="layer in poster.layers"
      :key="layer.name"
      class="piece"
      :class="{ photo: layer.name.startsWith('photo_') }"
      :src="asset(layer.file)"
      :data-entrance="entranceGroup(layer)"
      :data-enter-step="layer.name.startsWith('frequency_') ? 0.2 : layer.name.startsWith('cable') ? 0.14 : layer.name.startsWith('carabiner') ? 0.28 : 0"
      :data-sway="/^(carabiner|hand|cable)(?:_shadow)?$/.exec(layer.name)?.[1]"
      :data-motion-button="/^button(?:_blank|1_)/.test(layer.name) ? '' : undefined"
      :style="layerStyle(layer)"
      alt=""
    >
    <button
      class="unlock"
      type="button"
      aria-label="解鎖今晚的驚喜"
      aria-haspopup="dialog"
      :disabled="loading || !prizeId"
      :aria-busy="loading"
      @click="openPrize"
    />
    <a
      v-for="link in posterLinks"
      :key="link.href"
      class="poster-link"
      :href="link.href"
      :aria-label="link.label"
      :style="{ left: `${link.x / width * 100}%`, top: `${link.y / height * 100}%`, width: `${link.w / width * 100}%`, height: `${link.h / height * 100}%` }"
      target="_blank"
      rel="noopener noreferrer"
    />
  </main>

  <div v-if="loading" class="opening-overlay" role="status">
    <div class="opening-card" :style="{ backgroundImage: `url('${asset('assets/00_background.webp')}')` }">
      <span class="opening-brand">NOCAP</span>
      <strong>GRAND<br>OPENING</strong>
      <span class="opening-progress" aria-hidden="true" />
      <span class="opening-sr">正在解鎖今晚的驚喜</span>
    </div>
  </div>

  <p v-if="prizeError" class="prize-error" role="alert">{{ entryError || '暫時無法載入獎品，請再試一次。' }}</p>

  <dialog ref="dialog" class="prize-dialog" tabindex="-1" autofocus @close="resetResult" aria-label="今晚的驚喜">
    <div class="prize-content" :style="{ transform: `scale(${scale})` }">
      <PrizeResult
        v-if="resultMounted"
        :prize-id="prizeId"
        :redeemed="redeemed"
        :active="resultActive"
        @ready="resultResolve?.()"
        @error="resultReject?.()"
        @close="closePrize"
        @redeemed="redeemed = true"
      />
    </div>
  </dialog>
</template>

<style>
body { margin: 0; background: #202020; }
.poster { position: relative; width: min(801px, 100%); aspect-ratio: 801 / 1900; margin: auto; isolation: isolate; overflow: hidden; }
.page-loader {
  position: fixed;
  inset: 0;
  z-index: 110;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 18px;
  background: #202020;
}
.loading-label { color: #fff; font: 400 13px/1.4 system-ui, sans-serif; letter-spacing: .12em; }
.page-loader img {
  display: block;
  width: min(160px, 42vw);
  height: auto;
}
@media (prefers-reduced-motion: no-preference) {
  .page-loader img { animation: page-loading 1200ms ease-in-out infinite alternate; }
}
.loading-dots span { display: inline-block; }
@media (prefers-reduced-motion: no-preference) {
  .loading-dots span { animation: loading-dot 1200ms ease-in-out infinite; }
  .loading-dots span:nth-child(2) { animation-delay: 150ms; }
  .loading-dots span:nth-child(3) { animation-delay: 300ms; }
}
@keyframes loading-dot {
  0%, 60%, 100% { opacity: .3; transform: translateY(0); }
  30% { opacity: 1; transform: translateY(-3px); }
}
@keyframes page-loading {
  from { opacity: .6; transform: scale(.96); }
  to { opacity: 1; transform: scale(1); }
}
.poster-loading { visibility: hidden; }
.piece { position: absolute; display: block; }
.photo { object-fit: cover; }
.reveal-marker { position: absolute; left: 0; width: 1px; height: 1px; pointer-events: none; }
.unlock { position: absolute; left: 12.23%; top: 38%; width: 76.03%; height: 5.42%; z-index: 100; border: 0; border-radius: 24px; background: transparent; cursor: pointer; }
.unlock:disabled { cursor: wait; }
.opening-overlay {
  position: fixed; inset: 0; z-index: 110; display: grid; place-items: center;
  pointer-events: none; background: #05091cb8;
}
.opening-card {
  width: min(76vw, 320px); padding: 24px 16px; box-sizing: border-box;
  background: #092bb1 center top / cover; color: #fffaed; text-align: center;
  border: 2px solid #fff8e8; box-shadow: 5px 7px 0 #050922;
  font-family: Arial, sans-serif;
}
.opening-brand { font-size: 12px; font-weight: 900; letter-spacing: .28em; }
.opening-card strong {
  display: block; margin: 8px 0 14px; font-size: clamp(34px, 9vw, 60px);
  font-weight: 950; font-style: italic; line-height: .86; letter-spacing: -.05em;
}
.opening-progress { display: block; width: 48%; height: 3px; margin: auto; background: #fffaed; }
.opening-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
@media (prefers-reduced-motion: no-preference) {
  .opening-card { animation: opening-stamp 310ms cubic-bezier(.2,.8,.2,1) both; }
  .opening-progress { animation: opening-sweep 660ms ease-in-out infinite alternate both; }
}
@keyframes opening-stamp {
  from { opacity: 0; transform: translateY(16px) rotate(-8deg) scale(1.12); }
  to { opacity: 1; transform: rotate(-3deg); }
}
@keyframes opening-sweep {
  from { transform: scaleX(.15); }
  to { transform: scaleX(1); }
}
.poster-link { position: absolute; z-index: 100; border-radius: 24px; }
.unlock:focus-visible, .poster-link:focus-visible { outline: 3px solid #0739f6; outline-offset: 3px; }
@media (prefers-reduced-motion: no-preference) {
  .poster:has(.unlock:active) .piece[data-motion-button] { translate: 0 2px; filter: brightness(0.92); }
  .piece[data-motion-button] { transition: translate 120ms ease-out, filter 120ms ease-out; }
}
.prize-dialog { position: fixed; inset: auto; margin: 0; translate: -50% -50%; box-sizing: border-box; width: min(96vw, calc(94dvh * 793 / 1210), 793px); max-width: none; max-height: none; aspect-ratio: 793 / 1210; padding: 0; border: 0; background: transparent; overflow: hidden; }
.prize-dialog::backdrop { background: #000b; }
.prize-dialog,
.prize-dialog:focus,
.prize-dialog:focus-visible,
.prize-content,
.prize-content:focus,
.prize-content:focus-visible {
  outline: none;
  box-shadow: none;
}
.prize-content { position: absolute; inset: 0; display: block; width: 793px; height: 1210px; border: 0; transform-origin: top left; }
.prize-error { position: fixed; bottom: 12px; left: 12px; z-index: 100; background: white; padding: 8px; }
</style>
