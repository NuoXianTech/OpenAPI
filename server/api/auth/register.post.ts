// 注册接口
import type { H3Event } from 'h3'
import { createError, getRequestIP } from 'h3'
import { usersService } from '~~/server/service/userService'
import { hashPassword } from '~~/server/utils/auth'
import { validateEmail } from '~~/server/utils/validation'
import { verificationTokenService } from '../../service/verificationTokenService'
import { sendVerificationEmail } from '~~/server/utils/email'
import { siteSettingsService } from '~~/server/service/siteSettingsService'

export default defineEventHandler(async (event: H3Event) => {
  const settings = await siteSettingsService.getOrCreate()

  // 注册模式闸门：closed 直接拒绝，invite 要求有邀请码字段（先留 TODO 占位）。
  const mode = settings.registrationMode || 'open'
  if (mode === 'closed') {
    throw createError({ statusCode: 403, message: '注册功能已关闭' })
  }

  const body = await readBody(event) as Record<string, any>
  const username = (body.username || '').toString().trim()
  const email = (body.email || '').toString().trim().toLowerCase()
  const password = (body.password || '').toString()

  if (!username || !email || !password) {
    throw createError({ statusCode: 400, message: 'username, email and password are required' })
  }

  if (!validateEmail(email)) {
    throw createError({ statusCode: 400, message: 'Invalid email address' })
  }

  if (mode === 'invite') {
    // TODO: 接入邀请码校验（当前版本未实现，拒绝以保持安全默认）
    throw createError({ statusCode: 403, message: '仅邀请注册模式下未开放通道' })
  }

  // 检查是否已存在同名或同邮箱用户
  const existEmail = await usersService.findByEmail(email)
  if (existEmail) {
    throw createError({ statusCode: 409, message: 'Email already in use' })
  }
  const existUser = await usersService.findByUsername(username)
  if (existUser) {
    throw createError({ statusCode: 409, message: 'Username already in use' })
  }

  const passwordHash = await hashPassword(password)

  const created = await usersService.addUser({
    username,
    email,
    passwordHash,
    isActive: false,
  })

  const expiresInMinutes = Number(settings.emailVerifyExpiresInMinutes || 30)
  const ip = getRequestIP(event) || null
  const { token } = await verificationTokenService.createToken(created.id, created.email, expiresInMinutes, 'verify', ip)
  const normalizedSiteUrl = (settings.siteUrl || 'http://localhost:3000').replace(/\/+$/g, '')
  const verifyUrl = `${normalizedSiteUrl}/verify-email?user=${created.id}&token=${token}`
  await sendVerificationEmail(email, verifyUrl)

  const { passwordHash: _, ...safe } = created

  return {
    code: 0,
    msg: 'ok',
    data: {
      user: safe,
      verificationRequired: true,
    },
  }
})
