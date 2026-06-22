// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/test-utils/module',
    '@nuxthub/core',
    '@nuxt/ui',
    '@vueuse/nuxt',
    '~~/modules/api-manifest',
  ],
  devtools: {
    enabled: true,
  },
  css: ['~/assets/css/main.css'],
  ui: { fonts: false },
  // 认证密钥走 runtimeConfig（Nuxt 官方推荐范式）。默认值一律留空字符串、
  // 绝不引用 process.env —— 空默认值不会把任何 .env 值烤进 build 产物；
  // 运行时用「同构」的 NUXT_AUTH_* 变量覆盖（auth.jwtSecret → NUXT_AUTH_JWT_SECRET，
  // adminUsername → NUXT_AUTH_ADMIN_USERNAME，依此类推）。
  // 切忌把默认值设成异名 env（如 jwtSecret: process.env.JWT_SECRET）：那会在 build 时
  // 求值并烤进产物，且运行时只认 NUXT_AUTH_*、纯名字失效 —— Nuxt 文档明示的头号坑。
  runtimeConfig: {
    auth: {
      adminUsername: '',
      adminPassword: '',
      adminEmail: '',
      emailVerifySecret: '',
      apiKeySecret: '',
      jwtSecret: '',
    },
  },
  // Public list endpoints use short HTTP cache windows; private pages remain SSR
  // and are guarded on the server side.
  routeRules: {
    '/api/list': {
      headers: {
        'cache-control': 'public, max-age=10, stale-while-revalidate=60',
      },
    },
    '/api/api-categories/list': {
      headers: {
        'cache-control': 'public, max-age=30, stale-while-revalidate=300',
      },
    },
    '/api/friend-links/list': {
      headers: {
        'cache-control': 'public, max-age=60, stale-while-revalidate=300',
      },
    },
    '/api/announcements/list': {
      headers: {
        'cache-control': 'public, max-age=30, stale-while-revalidate=120',
      },
    },
    '/api/settings/public': {
      headers: {
        'cache-control': 'public, max-age=30, stale-while-revalidate=300',
      },
    },
  },
  experimental: {
    viewTransition: true,
    defaults: {
      nuxtLink: { prefetch: true, prefetchOn: { visibility: true } },
    },
  },
  compatibilityDate: '2025-07-15',
  // Pin the deploy target so the `.output` layout is deterministic across CI
  // environments; the production scripts assume the node-server preset.
  nitro: {
    preset: 'node-server',
    // NuxtHub's db client and the standalone migrate.mjs reach postgres /
    // drizzle-orm through dynamic `import(variable)`, which nft cannot trace, so
    // Nitro never bundles them. Force-trace the exact entrypoints both use (with
    // their transitive deps) into .output/server/node_modules — replacing the old
    // blind whole-package copy in scripts/prepare-output.mjs.
    externals: {
      traceInclude: [
        'postgres',
        'drizzle-orm/postgres-js',
        'drizzle-orm/postgres-js/migrator',
      ],
    },
  },
  hub: {
    db: {
      dialect: 'postgresql',
      // Build 时不自动执行迁移
      applyMigrationsDuringBuild: false,
      ...(process.env.DATABASE_URL
        ? {
            driver: 'postgres-js',
            connection: {
              connectionString: process.env.DATABASE_URL,
            },
          }
        : {}),
    },
  },
  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs',
      },
    },
  },
  icon: {
    serverBundle: { collections: ['mdi'] },
  },
})
