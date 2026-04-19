// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxthub/core',
    '@nuxt/icon',
    '@nuxtjs/tailwindcss',
    '@nuxt/ui',
    '@nuxt/eslint',
    '~~/modules/api-manifest',
  ],
  devtools: { enabled: true },
  css: ['~/assets/css/tailwind.css'],
  ui: { fonts: false },
  runtimeConfig: {
    auth: {
      adminUsername: process.env.ADMIN_USERNAME || '',
      adminPassword: process.env.ADMIN_PASSWORD || '',
      adminEmail: process.env.ADMIN_EMAIL || '',
      emailVerifySecret: process.env.EMAIL_VERIFY_SECRET || '',
      oauthSecretKey: process.env.OAUTH_SECRET_KEY || '',
    },
    apiGuard: {
      // 'memory' | 'postgres' | 'nuxthub-kv'；多实例部署推荐切为 'postgres'
      rateLimitDriver: process.env.API_GUARD_RATE_LIMIT_DRIVER || 'memory',
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
  eslint: {
    config: {
      stylistic: true,
    },
  },
})
