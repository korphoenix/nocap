<script setup lang="ts">
import prizes from '../../public/redemption/items.json'
import { alignPrize } from '../utils/prize-layout'

const props = defineProps<{ prizeId: string; redeemed: boolean; active: boolean }>()
const emit = defineEmits<{ ready: []; error: []; close: []; redeemed: [] }>()
const { app } = useRuntimeConfig()
const asset = (name: string) => app.baseURL + 'redemption/assets/' + name
const root = ref<HTMLElement>()
const product = ref<HTMLImageElement>()
const submitting = ref(false)
const revealMotion = !props.redeemed
const showForm = ref(false)
const pin = ref('')
const message = ref('')
const input = ref<HTMLInputElement>()
const prize = computed(() => prizes.find(item => item.id === props.prizeId))
const special = computed(() => props.prizeId.startsWith('special-') && !props.prizeId.includes('blow-shot'))
const instructions = computed(() => message.value || (props.redeemed
  ? '兌換成功，可隨時查看這份驚喜。'
  : showForm.value ? '請由店員輸入密碼，並確認兌換。' : '按下之後，請將手機交給店員輸入兌換密碼。'))
let disposed = false

async function openForm() {
  showForm.value = true
  await nextTick()
  input.value?.focus()
}

async function redeem() {
  if (submitting.value || props.redeemed || !pin.value) return
  submitting.value = true
  message.value = ''
  try {
    await $fetch(app.baseURL + 'api/prize/redeem', { method: 'POST', body: { pin: pin.value } })
    pin.value = ''
    showForm.value = false
    emit('redeemed')
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode
    pin.value = ''
    message.value = status === 403 ? '密碼不正確，請重新輸入。'
      : status === 401 ? 'LINE 登入已過期，請重新整理活動頁後再試。'
      : status === 404 ? '找不到抽獎紀錄，請重新整理活動頁後再試。'
      : '暫時無法確認兌換，請再試一次。'
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  try {
    if (!prize.value || !root.value || !product.value) throw new Error('Missing prize')
    const font = new FontFace('NocapPrize', `url("${asset('NotoSansTC-VF.ttf')}")`)
    const loadedFont = await font.load()
    document.fonts.add(loadedFont)
    await Promise.all(Array.from(root.value.querySelectorAll('img'), image => image.decode()))
    if (disposed) return
    const image = product.value
    const canvas = document.createElement('canvas')
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight
    const context = canvas.getContext('2d', { willReadFrequently: true })!
    context.drawImage(image, 0, 0)
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
    let left = canvas.width, top = canvas.height, right = 0, bottom = 0
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        if (pixels[(y * canvas.width + x) * 4 + 3] <= 35) continue
        left = Math.min(left, x)
        top = Math.min(top, y)
        right = Math.max(right, x)
        bottom = Math.max(bottom, y)
      }
    }
    const width = right - left + 1
    const height = bottom - top + 1
    const size = Math.min(330 / width, 310 / height) * (props.prizeId.includes('blow-shot') ? 1.25 : 1)
    Object.assign(image.style, {
      width: canvas.width * size + 'px', height: canvas.height * size + 'px',
      left: ((367 - width * size) / 2 - left * size) + 'px',
      top: ((365 - height * size) / 2 - top * size) + 'px',
    })
    alignPrize(props.prizeId, image)
    await document.fonts.ready
    if (!disposed) emit('ready')
  } catch {
    if (!disposed) emit('error')
  }
})
onBeforeUnmount(() => { disposed = true })
  const ribbons = [
    {box:[.105,.10,.075,.145], duration:4.1, drift:-9, turn:9},
    {box:[.01,.211,.15,.345], duration:5.3, drift:12, turn:-7},
    {box:[.025,.55,.08,.12], clip:"polygon(0 0,100% 0,100% 66%,50% 100%,0 100%)", duration:3.8, drift:-11, turn:14},
    {box:[.015,.61,.19,.27], clip:"polygon(45% 0,100% 0,100% 100%,0 100%,0 43%,32% 26%)", duration:4.8, drift:10, turn:-9},
    {box:[.77,.17,.23,.36], duration:5.7, drift:-12, turn:7},
    {box:[.875,.62,.09,.14], duration:4.3, drift:9, turn:-13},
  ];
function ribbonStyle(ribbon: typeof ribbons[number], index: number) {
  const [x, y, width, height] = ribbon.box
  return {
    left: x * 100 + '%', top: y * 100 + '%', width: width * 100 + '%', height: height * 100 + '%',
    '--delay': .24 + index * .025 + 's', '--from-x': (.5 - x - width / 2) * 627 + 'px',
    '--from-y': (.5 - y - height / 2) * 326 + 'px', '--duration': ribbon.duration + 's',
    '--drift': ribbon.drift + 'px', '--turn': ribbon.turn + 'deg',
  }
}
</script>

<template>
  <div ref="root" class="sheet" :class="{ 'motion-ready': active && revealMotion, 'motion-pending': !active }">
    <img class="background" :src="asset('paper.webp')" alt="">
    <button class="cross" type="button" aria-label="關閉" @click="emit('close')" />
    <div class="headline" :class="{ special }">
      <template v-if="special"><span class="special-en">NOCAP SPECIAL!</span><span class="special-zh">這杯我們請!</span></template>
      <template v-else>{{ prizeId.startsWith('coupon') ? '今晚享優惠！' : '這杯我們請！' }}</template>
    </div>
    <div class="underline" />
    <div class="ribbons ribbons-layered" aria-hidden="true">
      <div v-for="(ribbon, index) in ribbons" :key="index" class="ribbon-slot" :style="ribbonStyle(ribbon, index)">
        <div class="ribbon-piece" :style="{ clipPath: ribbon.clip }">
          <img :src="asset('ribbons.webp')" alt="" :style="{
            width: 100 / ribbon.box[2] + '%', height: 100 / ribbon.box[3] + '%',
            left: -ribbon.box[0] / ribbon.box[2] * 100 + '%', top: -ribbon.box[1] / ribbon.box[3] * 100 + '%',
          }">
        </div>
      </div>
    </div>
    <div class="prize" :class="{ blow: prizeId.includes('blow-shot') }">
      <img ref="product" :src="asset(prizeId + '.webp')" :alt="prize?.name">
    </div>
    <div class="rule left" /><div class="rule right" />
    <div class="name" :class="{ english: prizeId.startsWith('bomb') || prizeId.includes('blow-shot'), coupon: prizeId.startsWith('coupon'), cup: prizeId.startsWith('cup-') }">{{ prize?.name }}</div>
    <div class="sub">{{ prize?.sub }}</div>
    <a class="result-ig" href="https://www.instagram.com/nocap_taipei" target="_blank" rel="noopener noreferrer">兌換前，請先追蹤 NOCAP IG ↗</a>
    <div class="redeem-area">
      <output v-if="redeemed">已兌換</output>
      <button v-else type="button" :disabled="showForm || submitting" @click="openForm">兌換驚喜</button>
    </div>
    <div class="ig-note">兌換時請同時出示 IG 追蹤畫面</div>
    <div class="instructions" aria-live="polite">{{ instructions }}</div>
    <div class="footer">每人一次・當日兌換</div>
    <div v-if="showForm && !redeemed" class="staff-overlay">
      <section class="staff-panel" aria-label="店員核銷">
        <form @submit.prevent="redeem">
          <h2>店員核銷</h2>
          <p class="staff-prize">{{ prize?.name }}</p>
          <label for="staff-pin">店員密碼</label>
          <input id="staff-pin" ref="input" v-model="pin" type="password" autocomplete="off" :disabled="submitting" required>
          <p v-if="message" role="alert">{{ message }}</p>
          <button type="submit" :disabled="submitting || !delivered || !pin">
            {{ submitting ? '核銷中…' : '確認核銷' }}
          </button>
          <button type="button" class="cancel" :disabled="submitting" @click="showForm = false; pin = ''; message = ''">取消</button>
        </form>
      </section>
    </div>
  </div>
</template>

<style scoped>

*{box-sizing:border-box}.sheet{position:relative;width:793px;height:1983px;overflow:hidden;font-family:Noto,Arial,sans-serif}.sheet>*{position:absolute}.background{inset:0;width:793px;height:1983px}.cross{left:668px;top:562px;width:38px;height:38px}.cross:before,.cross:after{content:'';position:absolute;left:17px;top:-6px;width:4px;height:50px;background:#0739f6;transform:rotate(45deg)}.cross:after{transform:rotate(-45deg)}
.headline{left:110px;top:625px;width:573px;height:114px;display:flex;align-items:center;justify-content:center;font-size:86px;font-weight:950;font-style:italic;white-space:nowrap;color:#0739f6;letter-spacing:-5px;transform:skewX(-5deg)}
.underline{left:247px;top:747px;width:245px;height:18px;border-top:7px solid #fb8c26;border-radius:60%;transform:rotate(-8deg)}
.ribbons{left:83px;top:815px;width:627px;height:326px;object-fit:fill}
.prize{left:213px;top:797px;width:367px;height:365px;overflow:hidden}
.prize img{position:absolute;max-width:none}
.rule{top:1212px;height:3px;width:84px;background:#0739f6}.rule.left{left:116px}.rule.right{left:593px}
.name{left:214px;top:1177px;width:365px;height:66px;display:flex;align-items:center;justify-content:center;color:#0739f6;font-size:51px;font-weight:950;font-style:italic;white-space:nowrap;letter-spacing:-1px}
.name.english{font-family:Arial,sans-serif;font-size:36px;font-weight:900}.name.coupon{font-size:33px}
.sub{left:214px;top:1235px;width:365px;height:36px;text-align:center;color:#0739f6;font:bold italic 31px Arial;white-space:nowrap}
.qr{left:266.5px;top:1290px;width:260px;height:260px;border-radius:34px;background:linear-gradient(130deg,#dcdae7,#d9d8e5);display:flex;align-items:center;justify-content:center;color:#475a79;font-size:37px;font-weight:600;letter-spacing:2px}
.instructions{left:150px;top:1573px;width:493px;height:69px;text-align:center;font-size:29px;line-height:35px;font-weight:600;letter-spacing:1px;color:#101010}
.footer{left:150px;top:1653px;width:493px;height:32px;text-align:center;font-size:25px;line-height:32px;letter-spacing:3px;color:#415570;font-weight:600}
.headline.special{flex-direction:column;gap:8px;letter-spacing:-1px;transform:skewX(-5deg)}
.headline.special .special-en{font:900 italic 54px/56px Arial,sans-serif}
.headline.special .special-zh{font-size:47px;line-height:50px;font-weight:950;letter-spacing:1px}
.name.cup{font-size:30px;letter-spacing:-.5px}
.prize.blow{overflow:visible}
.sheet{transform:translateY(-520px);overflow:visible}.background{left:40px;top:520px;width:710px;height:1210px}.cross{cursor:pointer}
.redeem-area{left:206.5px;top:1352px;width:380px;height:124px;color:#0739f6;font-family:Noto,sans-serif}
.redeem-area [hidden]{display:none}
.redeem-area button,.redeem-area input{font:inherit}
.redeem-area>button,.redeem-area output,.redeem-area form{width:100%;height:100%;border-radius:22px;display:flex;align-items:center;justify-content:center}
.redeem-area>button,.redeem-area output{border:0;background:#0739f6;color:white;font-size:44px;font-weight:800;box-shadow:0 6px 0 #0325ae}
.redeem-area form{flex-wrap:wrap;background:#fffdf8;border:3px solid #0739f6;padding:6px 14px;gap:2px 10px}
.redeem-area label{width:100%;text-align:center;font-size:25px;font-weight:700}
.redeem-area input{width:190px;height:54px;text-align:center;font-size:34px;letter-spacing:5px;border:0;border-bottom:2px solid #0739f6;background:transparent}
.redeem-area form button{background:#0739f6;color:white;border:0;border-radius:10px;font-size:26px;padding:8px 14px}
.instructions{left:120px;top:1496px;width:553px;height:auto;font-size:29px;line-height:40px;text-wrap:balance}
.ig-note{left:90px;top:1599px;width:613px;text-align:center;font-size:23px;color:#415570}.footer{top:1634px}
/* Keep the paper grain while giving the sheet a neutral ivory tint. */
.background { filter: grayscale(1) sepia(.085); }
.prize.contact-shadow::before {
  content: "";
  position: absolute;
  left: 16%;
  right: 16%;
  top: 81.8%;
  height: 5.5%;
  background: radial-gradient(ellipse, rgba(62,52,42,.43), rgba(72,63,53,.19) 46%, transparent 73%);
}
.prize { overflow: visible; }
.sub:not(:empty){top:1253px;line-height:36px}
.result-ig{left:100px;top:1298px;width:593px;text-align:center;color:#0739df;font:700 26px Noto,sans-serif;}

.ribbons-layered { pointer-events:none; z-index:1; }
.prize { z-index:2; }
.ribbon-slot { position:absolute; }
.ribbon-piece { position:relative; width:100%; height:100%; overflow:hidden; }
.ribbon-piece img { position:absolute; max-width:none; user-select:none; }
.motion-ready .ribbon-slot { animation:ribbon-arrive 850ms cubic-bezier(.16,1,.3,1) var(--delay) both; }
.motion-ready .ribbon-piece { animation:ribbon-float var(--duration) ease-in-out calc(850ms + var(--delay)) infinite alternate; }
@keyframes ribbon-arrive {
  from { opacity:0; transform:translate3d(var(--from-x),var(--from-y),0) rotate(calc(var(--turn) * -3)) scale(.25); }
  25% { opacity:1; }
  to { opacity:1; transform:translate3d(0,0,0) rotate(0) scale(1); }
}
@keyframes ribbon-float {
  from { transform:translate3d(0,0,0) rotate(0); }
  to { transform:translate3d(var(--drift),-14px,0) rotate(var(--turn)); }
}
/* Individual translate/scale leave the original headline skew and layout intact. */
.headline { --enter-delay:0s; }
.underline { --enter-delay:.10s; }
.prize { --enter-delay:.24s; }
.name,.rule { --enter-delay:.42s; }
.sub { --enter-delay:.50s; }
.result-ig { --enter-delay:.58s; }
.redeem-area { --enter-delay:.66s; }
.instructions { --enter-delay:.74s; }
.ig-note,.footer { --enter-delay:.82s; }
.motion-ready :is(.headline,.underline,.name,.rule,.sub,.result-ig,.redeem-area,.instructions,.ig-note,.footer) {
  animation:content-arrive 600ms cubic-bezier(.16,1,.3,1) var(--enter-delay) both;
}
.motion-ready .prize { animation:prize-arrive 850ms cubic-bezier(.16,1,.3,1) var(--enter-delay) both; }
.motion-pending :is(.headline,.underline,.prize,.ribbons,.name,.rule,.sub,.result-ig,.redeem-area,.instructions,.ig-note,.footer) { opacity:0; }
@keyframes content-arrive {
  from { opacity:0; translate:0 18px; }
  to { opacity:1; translate:0 0; }
}
@keyframes prize-arrive {
  from { opacity:0; translate:0 24px; scale:.82; }
  to { opacity:1; translate:0 0; scale:1; }
}
@media (prefers-reduced-motion:reduce) {
  .motion-ready .ribbon-slot,.motion-ready .ribbon-piece,
  .motion-ready :is(.headline,.underline,.prize,.name,.rule,.sub,.result-ig,.redeem-area,.instructions,.ig-note,.footer) { animation:none; }
}
.sheet { font-family: NocapPrize, Arial, sans-serif; }
.redeem-area { font-family: NocapPrize, sans-serif; }
.result-ig { font-family: NocapPrize, sans-serif; }
.cross { border: 0; background: transparent; }
.staff-overlay {
  left: 0; top: 520px; width: 793px; height: 1210px;
  z-index: 10; display: grid; place-items: center; background: #10152b80;
}
.staff-panel {
  width: 590px; padding: 30px; border-radius: 24px; background: #fffdf8;
  color: #152049; font-family: NocapPrize, sans-serif; font-size: 26px;
  box-shadow: 0 12px 40px #0004;
}
.staff-panel h2 { font-size: 36px; margin: 0 0 16px; }
.staff-panel p { margin: 12px 0 20px; }
.staff-panel button {
  display: block; width: 100%; padding: 18px; border: 0; border-radius: 14px;
  background: #0739f6; color: white; font: inherit; font-weight: 700; cursor: pointer;
}
.staff-panel .cancel { margin-top: 12px; background: #e9ecf7; color: #152049; }
.staff-panel button:disabled { opacity: .45; cursor: default; }
.staff-panel input[type="password"] { width: 100%; padding: 12px; margin: 10px 0; font: inherit; border: 2px solid #9caad2; border-radius: 10px; }
.staff-panel [role="alert"] { color: #b22236; }
.staff-prize { font-weight: 700; }
/* Images never receive a focus ring; pointer focus on the close button stays unobtrusive. */
.sheet img { outline: none; border: 0; -webkit-tap-highlight-color: transparent; }
.cross:focus:not(:focus-visible) { outline: none; }
.cross:focus-visible { outline: 2px solid #0739f6; outline-offset: 6px; }
.sheet { -webkit-tap-highlight-color: transparent; }
</style>
