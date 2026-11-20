export default defineNuxtConfig({
  devtools: { enabled: false },
  runtimeConfig: {
    lineChannelId: '2012620913',
    supabaseUrl: 'https://iucrtdzxibklrkelpvzv.supabase.co',
    supabaseSecretKey: '',
    redemptionPin: '',
    adminPassword: '',
    allowRepeatDraws: false,
    public: {
      liffId: '',
      liffMock: '',
    },
  },
  app: {
    head: {
      title: 'NOCAP Open Frequency',
      htmlAttrs: { lang: 'zh-Hant' },
    },
  },
})
