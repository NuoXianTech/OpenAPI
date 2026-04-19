import type { H3Event } from 'h3'
import { timingSafeEqual } from 'node:crypto'
import { createError, getRequestIP } from 'h3'
import { createAdminSession } from '~~/server/utils/auth'
import { assertTurnstileForPage } from '~~/server/utils/turnstile'

function safeEquals(left: string, right: string) {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  if (leftBuffer.length !== rightBuffer.length) {
    return false
  }
  return timingSafeEqual(leftBuffer, rightBuffer)
}

export default defineEventHandler(async (event: H3Event) => {
  const body = await readBody(event) as Record<string, any>
  const username = (body.username || '').toString().trim()
  const password = (body.password || '').toString()
  const turnstileToken = (body.turnstileToken || '').toString()

  const authConfig = useRuntimeConfig().auth
  const adminUsername = (authConfig.adminUsername || '').toString()
  const adminPassword = (authConfig.adminPassword || '').toString()

  if (!adminUsername) {
    throw createError({ statusCode: 500, message: 'Admin username is not configured' })
  }

  if (!adminPassword) {
    throw createError({ statusCode: 500, message: 'Admin password is not configured' })
  }

  await assertTurnstileForPage('adminLogin', turnstileToken, getRequestIP(event) || null)

  if (!safeEquals(username, adminUsername) || !safeEquals(password, adminPassword)) {
    throw createError({ statusCode: 401, message: 'Invalid admin credentials' })
  }

  await createAdminSession(event)

  return {
    code: 0,
    msg: 'ok',
    data: {
      id: 0,
      kind: 'admin',
      username: adminUsername,
      email: authConfig.adminEmail,
    },
  }
})
