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
  // 路由级缓存：公共页面用 SWR / 后台页面纯 SPA 不预渲染，避免 SSR 时拉鉴权接口
  routeRules: {
    '/': { swr: 60 },
    '/friend-links': { swr: 60 },
    '/stats': { swr: 30 },
    '/admin/**': { ssr: false },
    '/user/**': { ssr: false },
    '/api/list': { headers: { 'cache-control': 'public, max-age=10, stale-while-revalidate=60' } },
    '/api/api-categories/list': { headers: { 'cache-control': 'public, max-age=30, stale-while-revalidate=300' } },
    '/api/friend-links/list': { headers: { 'cache-control': 'public, max-age=60, stale-while-revalidate=300' } },
    '/api/announcements/list': { headers: { 'cache-control': 'public, max-age=30, stale-while-revalidate=120' } },
    '/api/fab-menu/list': { headers: { 'cache-control': 'public, max-age=60, stale-while-revalidate=300' } },
    '/api/settings/public': { headers: { 'cache-control': 'public, max-age=30, stale-while-revalidate=300' } },
  },
  experimental: {
    // 减小 SSR HTML，二次访问从 _payload.json 取
    payloadExtraction: true,
    // 路由切换走视图过渡，更顺滑
    viewTransition: true,
    // 浏览器空闲时预热相邻路由
    defaults: {
      nuxtLink: { prefetch: true, prefetchOn: { visibility: true } },
    },
  },
  compatibilityDate: '2025-07-15',
  nitro: {
    // 启用静态资源压缩（brotli + gzip）
    compressPublicAssets: { brotli: true, gzip: true },
    // 路由切换 payload 缓存
    routeRules: {
      '/_nuxt/**': { headers: { 'cache-control': 'public, max-age=31536000, immutable' } },
    },
  },
  hub: {
    db: {
      dialect: 'postgresql',
    },
  },
  vite: {
    build: {
      // 将大体积依赖单独切包，避免主 bundle 膨胀阻塞首屏
      rollupOptions: {
        output: {
          manualChunks: {
            unovis: ['@unovis/vue', '@unovis/ts'],
            tanstack: ['@tanstack/vue-table'],
            zod: ['zod', '@vee-validate/zod', 'vee-validate'],
          },
        },
      },
    },
    // dev 阶段预构建，避免首次进入页面时长时间编译
    optimizeDeps: {
      include: [
        '@unovis/vue',
        '@unovis/ts',
        '@tanstack/vue-table',
        '@vueuse/core',
        'zod',
      ],
    },
  },
  eslint: {
    config: {
      stylistic: true,
    },
  },
  icon: {
    // 服务端按需打包 mdi 图标，避免客户端逐个 fetch /api/_nuxt_icon/*
    serverBundle: { collections: ['mdi'] },
  },
})
