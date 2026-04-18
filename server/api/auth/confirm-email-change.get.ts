// 消费 change_email token，更新用户 email。
import type { H3Event } from 'h3'
import { createError, getQuery } from 'h3'
import { usersService } from '~~/server/service/userService'
import { verificationTokenService } from '~~/server/service/verificationTokenService'

export default defineEventHandler(async (event: H3Event) => {
  const query = getQuery(event)
  const userId = Number(query.user || 0)
  const token = (query.token || '').toString()

  if (!userId || !token) {
    throw createError({ statusCode: 400, message: 'Invalid confirmation link' })
  }

  const user = await usersService.getById(userId)
  if (!user) {
    throw createError({ statusCode: 404, message: 'User not found' })
  }

  const tokenPayload = await verificationTokenService.consumeToken(userId, token, 'change_email')
  if (!tokenPayload) {
    throw createError({ statusCode: 400, message: 'Confirmation link expired or invalid' })
  }

  const newEmail = tokenPayload.email
  // 竞态保护：有人在等待期内注册了同邮箱
  const collision = await usersService.findByEmail(newEmail)
  if (collision && collision.id !== userId) {
    throw createError({ statusCode: 409, message: 'Email already in use' })
  }

  const updated = await usersService.updateEmail(userId, newEmail)
  if (!updated) {
    throw createError({ statusCode: 404, message: 'User not found' })
  }

  const { passwordHash: _, ...safe } = updated
  return { code: 0, msg: 'ok', data: safe }
})
