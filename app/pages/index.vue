<script setup lang="ts">
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

const { app } = useRuntimeConfig()
</script>

<template>
  <main class="announcement">
    <img
      :src="app.baseURL + 'assets/opening-announcement.png'"
      alt="NOCAP Open Frequency。抽獎網站準備中，將於 11 月 20 日（五）前上線。屆時再掃碼，就能解鎖你的開幕驚喜。現場兌換。"
      fetchpriority="high"
    >
  </main>
</template>

<style scoped>
.announcement {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  background: #050750;
}

.announcement img {
  display: block;
  width: 100%;
  height: 100%;
  min-height: 0;
  object-fit: contain;
}
</style>
