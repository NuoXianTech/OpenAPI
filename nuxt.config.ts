// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@nuxthub/core', '@nuxt/ui', '@vueuse/nuxt', '~~/modules/api-manifest', '@nuxtjs/i18n'],
  devtools: {
    enabled: true
  },
  css: [
    '~/assets/css/tailwind.css'
  ],
  ui: { fonts: false },
  runtimeConfig: {
    auth: {
      adminUsername: process.env.ADMIN_USERNAME || '',
      adminPassword: process.env.ADMIN_PASSWORD || '',
      adminEmail: process.env.ADMIN_EMAIL || '',
      emailVerifySecret: process.env.EMAIL_VERIFY_SECRET || '',
      oauthSecretKey: process.env.OAUTH_SECRET_KEY || '',
      apiKeySecret: process.env.API_KEY_SECRET || ''
    }
  },
  // Public list endpoints use short HTTP cache windows; private pages remain SSR
  // and are guarded on the server side.
  routeRules: {
    '/api/list': { headers: { 'cache-control': 'public, max-age=10, stale-while-revalidate=60' } },
    '/api/api-categories/list': { headers: { 'cache-control': 'public, max-age=30, stale-while-revalidate=300' } },
    '/api/friend-links/list': { headers: { 'cache-control': 'public, max-age=60, stale-while-revalidate=300' } },
    '/api/announcements/list': { headers: { 'cache-control': 'public, max-age=30, stale-while-revalidate=120' } },
    '/api/settings/public': { headers: { 'cache-control': 'public, max-age=30, stale-while-revalidate=300' } }
  },
  experimental: {
    viewTransition: true,
    defaults: {
      nuxtLink: { prefetch: true, prefetchOn: { visibility: true } }
    }
  },
  compatibilityDate: '2025-07-15',
  nitro: {
    // Production target: a single Node server process.
    preset: 'node-server',
    compressPublicAssets: { brotli: true, gzip: true }
  },
  hub: {
    db: {
      dialect: 'postgresql'
    }
  },
  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },
  icon: {
    serverBundle: { collections: ['mdi'] }
  }
})