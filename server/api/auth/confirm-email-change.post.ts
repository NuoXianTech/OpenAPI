// 消费 change_email token，更新用户 email。POST 携带 userId / token，避免邮件预扫描或浏览器预取误触发副作用。
import type { H3Event } from 'h3'
import { createError } from 'h3'
import { confirmEmailChangeSchema } from '#shared/schemas/auth'
import { usersService } from '~~/server/services/user-service'
import { verifyVerificationToken } from '~~/server/utils/verification-token'
import { readZodBody } from '~~/server/utils/zod'

export default defineEventHandler(async (event: H3Event) => {
  const { userId, token } = await readZodBody(event, confirmEmailChangeSchema)

  const user = await usersService.getById(userId)
  if (!user) {
    throw createError({ statusCode: 404, message: 'User not found' })
  }

  const tokenPayload = verifyVerificationToken(token, user, 'change_email')
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
  return safe
})
