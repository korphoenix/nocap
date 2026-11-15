export default defineNuxtConfig({
  devtools: { enabled: false },
  runtimeConfig: {
    public: {
      liffId: '',
    },
  },
  app: {
    head: {
      title: 'NOCAP Open Frequency',
      htmlAttrs: { lang: 'zh-Hant' },
    },
  },
})
