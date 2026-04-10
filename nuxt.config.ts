// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxthub/core',
    '@nuxt/icon',
    '@nuxt/ui',
    'shadcn-nuxt',
    '@nuxt/eslint',
  ],
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  ui: {
    fonts: false,
  },
  runtimeConfig: {
    auth: {
      adminUsername: process.env.ADMIN_USERNAME || '',
      adminPasswordHash: process.env.ADMIN_PASSWORD_HASH || '',
      adminPassword: process.env.ADMIN_PASSWORD || '',
      adminEmail: process.env.ADMIN_EMAIL || 'admin@openapi.local',
      emailVerifySecret: process.env.EMAIL_VERIFY_SECRET || 'openapi-email-verify-secret',
    },
    public: {
      startTime: '2026-01-01 00:00:00',
      siteUrl: 'http://localhost:3000',
      adminUsernameHint: process.env.ADMIN_USERNAME || 'admin',
      siteImg: 'https://q1.qlogo.cn/g?b=qq&nk=1428309052&s=640',
      siteName: 'OpenAPI',
      siteDescription: 'OpenAPI是免费为用户提供网络数据接口调用的服务平台。',
    },
  },
  compatibilityDate: '2025-07-15',
  hub: {
    db: {
      dialect: 'postgresql',
    },
  },
  vite: {
    optimizeDeps: {
      include: [
        'class-variance-authority',
        '@vueuse/core',
        'clsx',
        'tailwind-merge',
      ],
    },
  },
  eslint: {
    config: {
      stylistic: true,
    },
  },
})
