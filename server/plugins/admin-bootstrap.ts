import { randomBytes } from 'node:crypto'
import { INITIAL_ADMIN_PROFILE } from '#shared/config/admin-defaults'
import { usersService, USER_ROLES } from '~~/server/services/user-service'
import { hashPassword } from '~~/server/utils/auth'

const RETRY_DELAYS_MS = [500, 1000, 2000, 3000, 4000]

export default defineNitroPlugin(async () => {
  await runWhenDbReady()
})

async function runWhenDbReady() {
  let lastError: unknown = null
  for (let attempt = 0; attempt < RETRY_DELAYS_MS.length; attempt++) {
    await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS_MS[attempt]!))
    try {
      await ensureInitialAdmin()
      return
    } catch (err) {
      lastError = err
    }
  }

  throw new Error(
    `[admin-bootstrap] Initial administrator check failed after retries for ${INITIAL_ADMIN_PROFILE.username} <${INITIAL_ADMIN_PROFILE.email}>: ${(lastError as Error | null)?.message || 'unknown error'}`
  )
}

async function ensureInitialAdmin(): Promise<void> {
  if (await usersService.hasAdmin()) {
    return
  }

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

  console.info('[admin-bootstrap] Created initial administrator account.')
  console.info(`[admin-bootstrap] username: ${admin.username}`)
  console.info(`[admin-bootstrap] password: ${password}`)
  console.info('[admin-bootstrap] Sign in and rotate this password immediately.')
}
