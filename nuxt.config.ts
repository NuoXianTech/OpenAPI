// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@nuxthub/core', '@nuxt/ui', '@vueuse/nuxt', '~~/modules/api-manifest'],
  devtools: {
    enabled: true
  },
  css: [
    '~/assets/css/tailwind.css'
  ],
  ui: { fonts: false },
  runtimeConfig: {
    // 默认值留空，运行时由「名字匹配结构」的 NUXT_AUTH_* 环境变量覆盖。
    // Nuxt 生产环境只认 NUXT_ 前缀且与 runtimeConfig 结构同名的变量；
    // 写成 process.env.ADMIN_USERNAME 这类差异命名只在构建期有效、运行期会失效。
    auth: {
      adminUsername: '',
      adminPassword: '',
      adminEmail: '',
      emailVerifySecret: '',
      apiKeySecret: '',
      jwtSecret: ''
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
