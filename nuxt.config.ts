import { cp } from 'node:fs/promises'
import { resolve } from 'node:path'

// https://nuxt.com/docs/api/configuration/nuxt-config
const isProduction = process.env.NODE_ENV === 'production'
const databaseMigrationsDir = 'server/db/migrations/postgresql'
const privatePageRouteRule = {
  headers: {
    'cache-control': 'private, no-store'
  }
}

export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/test-utils/module',
    '@nuxt/ui',
    '@vueuse/nuxt',
  ],
  devtools: {
    enabled: !isProduction,
  },
  css: ['~/assets/css/main.css'],
  ui: {
    fonts: false,
    experimental: {
      componentDetection: true
    }
  },
  // 认证密钥走 runtimeConfig（Nuxt 官方推荐范式）。默认值一律留空字符串、
  // 绝不引用 process.env —— 空默认值不会把任何 .env 值烤进 build 产物；
  // 运行时用「同构」的 NUXT_AUTH_* 变量覆盖（auth.secret → NUXT_AUTH_SECRET）。
  // 切忌把默认值设成异名 env（如 secret: process.env.AUTH_SECRET）：那会在 build 时
  // 求值并烤进产物，且运行时只认 NUXT_AUTH_*、纯名字失效 —— Nuxt 文档明示的头号坑。
  runtimeConfig: {
    auth: {
      secret: '',
      apiKeySecret: '',
    },
    redis: {
      url: '',
      keyPrefix: 'openapi:',
      connectTimeoutMs: 2_000,
      required: false
    }
  },
  routeRules: {
    '/admin': privatePageRouteRule,
    '/admin/**': privatePageRouteRule,
    '/user': privatePageRouteRule,
    '/user/**': privatePageRouteRule,
    '/login': privatePageRouteRule,
    '/register': privatePageRouteRule,
    '/oauth': privatePageRouteRule,
    '/oauth/**': privatePageRouteRule,
    '/verify-email': privatePageRouteRule,
    '/confirm-email-change': privatePageRouteRule,
    '/forgot-password': privatePageRouteRule,
    '/reset-password': privatePageRouteRule
  },
  compatibilityDate: '2026-06-30',
  nitro: {
    preset: 'node-server',
    externals: {
      traceInclude: [
        '@electric-sql/pglite',
        'postgres',
        'drizzle-orm/pglite',
        'drizzle-orm/pglite/migrator',
        'drizzle-orm/postgres-js',
        'drizzle-orm/postgres-js/migrator',
      ],
    },
    hooks: {
      async compiled(nitro) {
        await cp(
          resolve(databaseMigrationsDir),
          resolve(nitro.options.output.serverDir, 'db/migrations/postgresql'),
          { recursive: true, force: true }
        )
      }
    }
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
