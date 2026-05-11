import type { H3Event } from 'h3'
import { usersService } from '~~/server/service/userService'
import { createError, getRequestIP } from 'h3'
import { createUserSession, verifyPassword } from '~~/server/utils/auth'
import { assertTurnstileForPage } from '~~/server/utils/turnstile'

export default defineEventHandler(async (event: H3Event) => {
  const body = await readBody(event) as Record<string, unknown>
  const emailOrUsername = String(body.email ?? body.username ?? '').trim()
  const password = String(body.password ?? '')
  const turnstileToken = String(body.turnstileToken ?? '')
  const remember = body.remember === true || body.remember === 'true'

  if (!emailOrUsername || !password) {
    throw createError({ statusCode: 400, message: 'email/username and password are required' })
  }

  const ip = getRequestIP(event) || '0.0.0.0'
  await assertTurnstileForPage('login', turnstileToken, ip)

  // 支持通过 email 或 username 登录
  let user = null
  if (emailOrUsername.includes('@')) {
    user = await usersService.findByEmail(emailOrUsername.toLowerCase())
  }
  else {
    user = await usersService.findByUsername(emailOrUsername)
  }

  if (!user) {
    throw createError({ statusCode: 401, message: 'Invalid credentials' })
  }

  const ok = await verifyPassword(user.passwordHash, password)
  if (!ok) {
    throw createError({ statusCode: 401, message: 'Invalid credentials' })
  }

  if (user.isBanned) {
    throw createError({ statusCode: 403, message: 'Account is banned' })
  }

  if (!user.isActive) {
    throw createError({ statusCode: 403, message: 'Email not verified' })
  }

  await createUserSession(event, {
    id: user.id,
    kind: 'user',
  }, { remember })

  await usersService.updateLastLogin(user.id, ip)

  const { passwordHash: _, ...safe } = user

  return { ...safe, kind: 'user' }
})
// 登录接口
