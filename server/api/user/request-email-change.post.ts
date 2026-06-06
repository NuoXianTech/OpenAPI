// 登录用户请求变更邮箱：发确认链接到"新"邮箱。
import type { H3Event } from 'h3'
import { createError } from 'h3'
import { userRequestEmailChangeSchema } from '#shared/schemas/user'
import { usersService } from '~~/server/service/userService'
import { siteSettingsService } from '~~/server/service/siteSettingsService'
import { signVerificationToken } from '~~/server/utils/verificationToken'
import { sendEmailChangeEmail } from '~~/server/utils/email'
import { requireAuth, verifyPassword } from '~~/server/utils/auth'
import { readZodBody } from '~~/server/utils/zod'

export default defineEventHandler(async (event: H3Event) => {
  const authUser = await requireAuth(event)
  const { currentPassword, newEmail } = await readZodBody(event, userRequestEmailChangeSchema)

  if (newEmail === authUser.email.toLowerCase()) {
    throw createError({ statusCode: 400, message: 'New email must differ from current email' })
  }

  // 校验当前密码，防止他人借未锁定浏览器把账号绑定到自己邮箱
  const userRow = await usersService.getById(authUser.id)
  if (!userRow) {
    throw createError({ statusCode: 404, message: '用户不存在' })
  }
  const ok = await verifyPassword(userRow.passwordHash, currentPassword)
  if (!ok) {
    throw createError({ statusCode: 400, message: '当前密码不正确' })
  }

  // 新邮箱不能被占用
  const existing = await usersService.findByEmail(newEmail)
  if (existing) {
    throw createError({ statusCode: 409, message: 'Email already in use' })
  }

  const settings = await siteSettingsService.getOrCreate()
  const expiresInMinutes = Number(settings.emailVerifyExpiresInMinutes || 30)

  // binding 取「当前(旧)」邮箱（userRow.email）；payload.email 存「新」邮箱，确认时写入 users.email。
  const token = signVerificationToken(userRow, { purpose: 'change_email', email: newEmail, expiresInMinutes })
  const normalizedSiteUrl = (settings.siteUrl || 'http://localhost:3000').replace(/\/+$/g, '')
  const confirmUrl = `${normalizedSiteUrl}/confirm-email-change?user=${authUser.id}&token=${token}`
  await sendEmailChangeEmail(newEmail, confirmUrl)

  return { pendingEmail: newEmail }
})
