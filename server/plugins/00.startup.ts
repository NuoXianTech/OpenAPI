// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../../.nuxt/types/api-manifest.d.ts" />

import { randomBytes } from 'node:crypto'
import { API_MANIFEST as RAW_API_MANIFEST } from '#api-manifest'
import { INITIAL_ADMIN_PROFILE } from '#shared/config/admin-defaults'
import { apis } from '~~/server/db/schema'
import { db } from '~~/server/db/client'
import { runDatabaseMigrations } from '~~/server/db/migrate'
import { DEFAULT_API_REGISTRATION } from '~~/server/config/api-guard'
import { apiService } from '~~/server/services/api-service'
import { usersService, USER_ROLES } from '~~/server/services/user-service'
import type { ManifestApi } from '~~/server/types/api-guard'
import { hashPassword } from '~~/server/utils/auth'

const API_MANIFEST = RAW_API_MANIFEST as readonly ManifestApi[]

function inferApiPath(api: ManifestApi): string {
  const baseEndpoint = api.endpoints.find(endpoint => endpoint.paramNames.length === 0) ?? api.endpoints[0]
  return baseEndpoint?.apiPath.replace(/\/:[^/]+$/, '') || `/${api.pathVersion}/${api.code}`
}

function inferHttpMethod(api: ManifestApi): string {
  const methods = Array.from(new Set(api.endpoints.map(endpoint => endpoint.method)))
    .filter(method => method !== 'ANY')

  return methods.length > 0 ? methods.join(',') : 'GET'
}

function createManifestRegistration(api: ManifestApi) {
  return {
    pathVersion: api.pathVersion,
    code: api.code,
    apiPath: inferApiPath(api),
    httpMethod: inferHttpMethod(api),
    endpointCount: api.endpoints.length,
    createdBy: null,
    defaults: {
      name: api.code,
      shortDesc: `${api.pathVersion} ${api.code}`,
      description: `Auto-registered from manifest: ${api.pathVersion}/${api.code}`,
      docUrl: '',
      status: DEFAULT_API_REGISTRATION.status,
      categoryId: null,
      isEnabled: DEFAULT_API_REGISTRATION.isEnabled,
      isApiKey: DEFAULT_API_REGISTRATION.isApiKey,
      isStatistics: DEFAULT_API_REGISTRATION.isStatistics,
      rateLimitPerSecond: DEFAULT_API_REGISTRATION.rateLimitPerSecond,
      rateLimitPerMinute: DEFAULT_API_REGISTRATION.rateLimitPerMinute,
      rateLimitPerHour: DEFAULT_API_REGISTRATION.rateLimitPerHour,
      rateLimitPerDay: DEFAULT_API_REGISTRATION.rateLimitPerDay,
      dailyQuota: DEFAULT_API_REGISTRATION.dailyQuota,
      methodCosts: DEFAULT_API_REGISTRATION.methodCosts,
      timeoutMs: DEFAULT_API_REGISTRATION.timeoutMs
    }
  }
}

async function migrateDatabase(): Promise<void> {
  if (process.env.DB_AUTO_MIGRATE === 'false') {
    console.info('[startup] Database migrations skipped because DB_AUTO_MIGRATE=false')
    return
  }

  await runDatabaseMigrations()
}

async function ensureInitialAdmin(): Promise<void> {
  if (await usersService.hasAdmin()) return

  const password = randomBytes(18).toString('base64url')
  const admin = await usersService.addUser({
    role: USER_ROLES.admin,
    username: INITIAL_ADMIN_PROFILE.username,
    email: INITIAL_ADMIN_PROFILE.email,
    passwordHash: await hashPassword(password),
    displayName: INITIAL_ADMIN_PROFILE.displayName,
    isActive: true,
    emailVerifiedAt: new Date()
  })

  console.info('[startup] Created initial administrator account.')
  console.info(`[startup] username: ${admin.username}`)
  console.info(`[startup] password: ${password}`)
  console.info('[startup] Sign in and rotate this password immediately.')
}

async function syncApiManifest(): Promise<void> {
  const databaseApis = await db.select({
    id: apis.id,
    code: apis.code,
    pathVersion: apis.pathVersion,
    isOrphaned: apis.isOrphaned
  }).from(apis)

  const databaseKeys = new Set(databaseApis.map(api => `${api.pathVersion}:${api.code}`))
  const manifestKeys = new Set(API_MANIFEST.map(api => `${api.pathVersion}:${api.code}`))
  const registeredApis: string[] = []

  for (const api of API_MANIFEST) {
    const key = `${api.pathVersion}:${api.code}`
    await apiService.registerFromManifest(createManifestRegistration(api))
    if (!databaseKeys.has(key)) registeredApis.push(`${api.pathVersion}/${api.code}`)
  }

  const orphanedApis = databaseApis.filter(api => (
    api.pathVersion.startsWith('v')
    && !api.isOrphaned
    && !manifestKeys.has(`${api.pathVersion}:${api.code}`)
  ))

  for (const api of orphanedApis) {
    await apiService.markOrphaned(api.id)
  }

  if (registeredApis.length > 0) {
    console.info(
      `[startup] Auto-registered ${registeredApis.length} APIs; enable them in admin:`,
      registeredApis.join(', ')
    )
  }

  if (orphanedApis.length > 0) {
    console.warn(
      `[startup] Marked ${orphanedApis.length} APIs as orphaned and disabled:`,
      orphanedApis.map(api => `${api.pathVersion}/${api.code}`).join(', ')
    )
  }
}

async function initializeServer(): Promise<void> {
  await migrateDatabase()
  await ensureInitialAdmin()
  await syncApiManifest()
}

export default defineNitroPlugin((nitroApp) => {
  const initialization = initializeServer()

  // Nitro 会先开始监听，再执行异步插件任务。所有请求统一等待初始化完成，
  // 避免首批 SSR / API 请求在迁移完成前访问尚不存在的表。
  const removeInitializationGate = nitroApp.hooks.hook('request', () => initialization)

  void initialization
    .then(() => {
      removeInitializationGate()
      console.info('[startup] Server initialization completed.')
    })
    .catch((error) => {
      console.error('[startup] Server initialization failed.', error)
      process.exit(1)
    })
})
