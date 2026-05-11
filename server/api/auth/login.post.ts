import type { H3Event } from 'h3'
import { createError, getRequestIP } from 'h3'
import { loginSchema } from '#shared/schemas/auth'
import { usersService } from '~~/server/service/userService'
import { createUserSession, verifyPassword } from '~~/server/utils/auth'
import { assertTurnstileForPage } from '~~/server/utils/turnstile'
import { readZodBody } from '~~/server/utils/zod'

export default defineEventHandler(async (event: H3Event) => {
  const body = await readZodBody(event, loginSchema)
  const emailOrUsername = body.email || body.username || ''
  const { password } = body
  const turnstileToken = body.turnstileToken ?? ''
  const remember = body.remember === true

  const ip = getRequestIP(event) || '0.0.0.0'
  await assertTurnstileForPage('login', turnstileToken, ip)

  // 支持通过 email 或 username 登录
  const user = emailOrUsername.includes('@')
    ? await usersService.findByEmail(emailOrUsername)
    : await usersService.findByUsername(emailOrUsername)

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
