// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxthub/core',
    '@nuxt/ui',
    '@nuxt/eslint',
    '~~/modules/api-manifest',
  ],
  devtools: { enabled: true },
  app: {
    head: {
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
      ],
    },
  },
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
      // 'memory' | 'postgres' | 'kv'；留空 → 自动选择：
      //   NuxtHub 部署（NUXT_HUB_PROJECT_KEY 存在）→ kv，否则 → memory
      // 多实例 Node + 共享 PG 部署可在此显式置为 'postgres'；
      // 仍可通过 Nuxt 标准的 NUXT_API_GUARD_RATE_LIMIT_DRIVER 环境变量按部署覆盖。
      rateLimitDriver: '',
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
    '/api/settings/public': { headers: { 'cache-control': 'public, max-age=30, stale-while-revalidate=300' } },
  },
  experimental: {
    // 减小 SSR HTML，二次访问从 _payload.json 取；dev 下 Windows unstorage fs driver 偶发把 payload 路径当文件写导致 ENOENT，故仅生产启用
    payloadExtraction: process.env.NODE_ENV === 'production',
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
            zod: ['zod'],
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
    // 服务端按需打包 mdi/lucide 图标，避免客户端逐个 fetch /api/_nuxt_icon/*
    serverBundle: { collections: ['mdi', 'lucide'] },
  },
})
