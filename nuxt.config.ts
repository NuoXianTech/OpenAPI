// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxthub/core',
    '@nuxt/icon',
    '@nuxt/ui',
    '@nuxt/eslint',
  ],
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  ui: {
    fonts: false,
  },
  runtimeConfig: {
    auth: {
      sessionMaxAgeSeconds: Number(process.env.SESSION_MAX_AGE || 60 * 60 * 24 * 7),
      adminUsername: process.env.ADMIN_USERNAME || 'admin',
      adminPassword: process.env.ADMIN_PASSWORD || '',
      adminEmail: process.env.ADMIN_EMAIL || 'admin@openapi.local',
    },
    smtp: {
      host: process.env.SMTP_HOST || 'smtp.example.com',
      port: Number(process.env.SMTP_PORT || 465),
      secure: (process.env.SMTP_SECURE || 'true') === 'true',
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
      from: process.env.SMTP_FROM || 'no-reply@example.com',
    },
    public: {
      startTime: process.env.START_TIME || '2026-01-01 00:00:00',
      emailVerifyExpiresInMinutes: Number(process.env.EMAIL_VERIFY_EXPIRES_IN || 30),
      siteUrl: process.env.SITE_URL || 'http://localhost:3000',
      adminUsernameHint: process.env.ADMIN_USERNAME || 'admin',
      apiImg:
        process.env.API_IMG || 'https://q1.qlogo.cn/g?b=qq&nk=1428309052&s=640',
      apiName: process.env.API_NAME || 'OpenAPI',
      apiDescription:
        process.env.API_DESCRIPTION
        || 'OpenAPI是免费为用户提供网络数据接口调用的服务平台。',
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
