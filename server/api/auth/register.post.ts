// 注册接口
import type { H3Event } from 'h3'
import { usersService } from '~~/server/service/userService'
import { createError } from 'h3'
import { hashPassword } from '~~/server/utils/auth'
import { validateEmail } from '~~/server/utils/validation'
import { emailVerificationService } from '../../service/emailVerificationService'
import { sendVerificationEmail } from '~~/server/utils/email'

export default defineEventHandler(async (event: H3Event) => {
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

  // 检查是否已存在同名或同邮箱用户
  const existEmail = await usersService.findByEmail(email)
  if (existEmail) {
    throw createError({ statusCode: 409, message: 'Email already in use' })
  }
  const existUser = await usersService.findByUsername(username)
  if (existUser) {
    throw createError({ statusCode: 409, message: 'Username already in use' })
  }

  // 哈希密码并保存
  const passwordHash = await hashPassword(password)

  const created = await usersService.addUser({
    username,
    email,
    passwordHash,
    isActive: false,
  })

  const runtimeConfig = useRuntimeConfig()
  const expiresInMinutes = Number(runtimeConfig.public.emailVerifyExpiresInMinutes || 30)
  const { token } = await emailVerificationService.createToken(created.id, created.email, expiresInMinutes)
  const verifyUrl = `${runtimeConfig.public.siteUrl}/verify-email?user=${created.id}&token=${token}`
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
