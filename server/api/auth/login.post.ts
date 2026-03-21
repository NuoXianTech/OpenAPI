import type { H3Event } from 'h3'
import { usersService } from '~~/server/service/userService'
import { createError, getRequestIP } from 'h3'
import { createUserSession, verifyPassword } from '~~/server/utils/auth'

export default defineEventHandler(async (event: H3Event) => {
  const body = await readBody(event) as Record<string, any>
  const emailOrUsername = (body.email || body.username || '').toString().trim()
  const password = (body.password || '').toString()

  if (!emailOrUsername || !password) {
    throw createError({ statusCode: 400, message: 'email/username and password are required' })
  }

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
  })

  const ip = getRequestIP(event) || '0.0.0.0'
  await usersService.updateLastLogin(user.id, ip)

  // 更新最后登录时间/IP 可在此处实现（略）

  const { passwordHash: _, ...safe } = user

  return {
    code: 0,
    msg: 'ok',
    data: { ...safe, kind: 'user' },
  }
})
// 登录接口
