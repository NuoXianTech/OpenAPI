import type { H3Event } from 'h3'
import { createError } from 'h3'
import { authPolicyService } from '~~/server/service/authPolicyService'
import { requireAdmin } from '~~/server/utils/auth'

export default defineEventHandler(async (event: H3Event) => {
  requireAdmin(event)
  const body = await readBody(event) as Record<string, any>

  const minPasswordLength = Number(body.minPasswordLength)
  const maxPasswordLength = Number(body.maxPasswordLength)
  const minUsernameLength = Number(body.minUsernameLength)
  const maxUsernameLength = Number(body.maxUsernameLength)

  if (!Number.isFinite(minPasswordLength) || !Number.isFinite(maxPasswordLength)) {
    throw createError({ statusCode: 400, message: 'Invalid password length config' })
  }
  if (!Number.isFinite(minUsernameLength) || !Number.isFinite(maxUsernameLength)) {
    throw createError({ statusCode: 400, message: 'Invalid username length config' })
  }
  if (minPasswordLength < 6 || maxPasswordLength < minPasswordLength) {
    throw createError({ statusCode: 400, message: 'Password length range is invalid' })
  }
  if (minUsernameLength < 2 || maxUsernameLength < minUsernameLength) {
    throw createError({ statusCode: 400, message: 'Username length range is invalid' })
  }

  const policy = await authPolicyService.updatePolicy({
    minPasswordLength,
    maxPasswordLength,
    minUsernameLength,
    maxUsernameLength,
    requireUppercase: Boolean(body.requireUppercase),
    requireLowercase: Boolean(body.requireLowercase),
    requireDigit: Boolean(body.requireDigit),
    requireSpecial: Boolean(body.requireSpecial),
    specialChars: (body.specialChars || '').toString() || authPolicyService.defaultPolicy.specialChars,
  })

  return {
    code: 0,
    msg: 'ok',
    data: policy,
  }
})
