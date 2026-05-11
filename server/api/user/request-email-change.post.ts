// 登录用户请求变更邮箱：发确认链接到"新"邮箱。
import type { H3Event } from 'h3'
import { createError, getRequestIP } from 'h3'
import { userRequestEmailChangeSchema } from '#shared/schemas/user'
import { usersService } from '~~/server/service/userService'
import { siteSettingsService } from '~~/server/service/siteSettingsService'
import { verificationTokenService } from '~~/server/service/verificationTokenService'
import { sendEmailChangeEmail } from '~~/server/utils/email'
import { requireAuth } from '~~/server/utils/auth'
import { readZodBody } from '~~/server/utils/zod'

export default defineEventHandler(async (event: H3Event) => {
  const authUser = await requireAuth(event)
  const { newEmail } = await readZodBody(event, userRequestEmailChangeSchema)

  if (newEmail === authUser.email.toLowerCase()) {
    throw createError({ statusCode: 400, message: 'New email must differ from current email' })
  }

  // 新邮箱不能被占用
  const existing = await usersService.findByEmail(newEmail)
  if (existing) {
    throw createError({ statusCode: 409, message: 'Email already in use' })
  }

  const settings = await siteSettingsService.getOrCreate()
  const expiresInMinutes = Number(settings.emailVerifyExpiresInMinutes || 30)
  const ip = getRequestIP(event) || null

  // purpose=change_email 时，email 字段存"新邮箱"，消费时校验匹配并更新 users.email。
  const { token } = await verificationTokenService.createToken(authUser.id, newEmail, expiresInMinutes, 'change_email', ip)
  const normalizedSiteUrl = (settings.siteUrl || 'http://localhost:3000').replace(/\/+$/g, '')
  const confirmUrl = `${normalizedSiteUrl}/confirm-email-change?user=${authUser.id}&token=${token}`
  await sendEmailChangeEmail(newEmail, confirmUrl)

  return { pendingEmail: newEmail }
})
