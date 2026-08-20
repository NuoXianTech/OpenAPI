import { randomBytes } from 'node:crypto'
import { getRequestURL } from 'h3'
import { z } from 'zod'
import { INITIAL_ADMIN_PROFILE } from '#shared/config/admin-defaults'
import { assertRuntimeEnvironment } from '~~/server/config/runtime-env'
import { closeDatabase } from '~~/server/db/client'
import { runDatabaseMigrations } from '~~/server/db/migrate'
import { adminUserService } from '~~/server/services/admin-user-service'
import { platformWorkspaceService } from '~~/server/services/platform-workspace-service'
import { userService, USER_ROLES } from '~~/server/services/user-service'
import { getSqlState } from '~~/server/utils/database-error'
import { hashPassword } from '~~/server/utils/password'
import { closeRedis, initializeRedis } from '~~/server/utils/redis'

async function migrateDatabase(): Promise<void> {
  if (process.env.DB_AUTO_MIGRATE === 'false') {
    console.info('[startup] Database migrations skipped because DB_AUTO_MIGRATE=false')
    return
  }
  await runDatabaseMigrations()
}

async function ensureInitialAdmin(): Promise<void> {
  if (await adminUserService.hasAdmin()) return

  const password = randomBytes(18).toString('base64url')
  let admin: Awaited<ReturnType<typeof userService.addUser>>
  try {
    admin = await userService.addUser({
      role: USER_ROLES.admin,
      username: INITIAL_ADMIN_PROFILE.username,
      email: INITIAL_ADMIN_PROFILE.email,
      passwordHash: await hashPassword(password),
      displayName: INITIAL_ADMIN_PROFILE.displayName,
      isActive: true,
      emailVerifiedAt: new Date()
    })
  } catch (error) {
    if (getSqlState(error) === '23505' && await adminUserService.hasAdmin()) {
      console.info('[startup] Initial administrator was created by another instance.')
      return
    }
    throw error
  }

  console.info('[startup] Created initial administrator account.')
  console.info(`[startup] username: ${admin.username}`)
  console.info(`[startup] initial password: ${password}`)
  console.info('[startup] This password is shown once. Sign in and change it immediately.')
}

async function initializeRedisService(): Promise<void> {
  const client = await initializeRedis()
  console.info(client ? '[redis] Connection ready.' : '[redis] Not configured; memory fallback active.')
}

async function initializeDatabaseState(): Promise<void> {
  await migrateDatabase()
  await ensureInitialAdmin()
  await platformWorkspaceService.ensureDefault()
}

async function initializeServer(): Promise<void> {
  await initializeDatabaseState()
  await initializeRedisService()
}

async function closeServer(): Promise<void> {
  await Promise.all([
    closeRedis(),
    closeDatabase()
  ])
}

export default defineNitroPlugin((nitroApp) => {
  z.config(z.locales.zhCN())
  assertRuntimeEnvironment()
  const initialization = initializeServer()
  const removeInitializationGate = nitroApp.hooks.hook('request', (event) => {
    if (getRequestURL(event).pathname === '/api/health') return
    return initialization
  })

  void initialization
    .then(() => {
      removeInitializationGate()
      console.info('[startup] Server initialization completed.')
    })
    .catch(async (error) => {
      console.error('[startup] Server initialization failed.', error)
      try {
        await closeServer()
      } catch (closeError) {
        console.error('[startup] Failed to close resources after initialization error.', closeError)
      }
      process.exit(1)
    })

  nitroApp.hooks.hook('close', closeServer)
})
