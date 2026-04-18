// 消费 reset_password token 并设置新密码。
import type { H3Event } from 'h3'
import { createError, readBody } from 'h3'
import { usersService } from '~~/server/service/userService'
import { verificationTokenService } from '~~/server/service/verificationTokenService'
import { sessionService } from '~~/server/service/sessionService'
import { hashPassword } from '~~/server/utils/auth'

const MIN_PASSWORD_LENGTH = 8

export default defineEventHandler(async (event: H3Event) => {
  const body = await readBody(event) as Record<string, any>
  const userId = Number(body.userId || 0)
  const token = (body.token || '').toString()
  const newPassword = (body.newPassword || '').toString()

  if (!userId || !token || !newPassword) {
    throw createError({ statusCode: 400, message: 'userId, token and newPassword are required' })
  }

  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    throw createError({ statusCode: 400, message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` })
  }

  const user = await usersService.getById(userId)
  if (!user) {
    throw createError({ statusCode: 404, message: 'User not found' })
  }

  const tokenPayload = await verificationTokenService.consumeToken(userId, token, 'reset_password')
  if (!tokenPayload || tokenPayload.email !== user.email) {
    throw createError({ statusCode: 400, message: 'Reset link expired or invalid' })
  }

  const passwordHash = await hashPassword(newPassword)
  await usersService.updatePasswordHash(userId, passwordHash)

  // 密码改动后，强制所有活动会话下线，避免旧设备继续访问。
  await sessionService.deleteSessionsByUserId(userId)

  return { code: 0, msg: 'ok', data: null }
})
