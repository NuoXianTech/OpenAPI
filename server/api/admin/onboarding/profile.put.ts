import type { H3Event } from 'h3'
import { createError } from 'h3'
import { ADMIN_PROFILE_ONBOARDING_UPDATE_ACTION } from '#shared/config/admin-defaults'
import { adminInitialProfileSchema } from '~~/server/schemas/admin'
import { operationLogService } from '~~/server/services/operation-log-service'
import { usersService } from '~~/server/services/user-service'
import { requireAdmin } from '~~/server/utils/auth'
import { readRequestMeta } from '~~/server/utils/request-meta'
import { readZodBody } from '~~/server/utils/zod'

export default defineEventHandler(async (event: H3Event) => {
  const admin = await requireAdmin(event)
  const body = await readZodBody(event, adminInitialProfileSchema)
  const current = await usersService.getById(admin.id)

  if (!current) {
    throw createError({ statusCode: 404, message: '管理员账号不存在' })
  }

  const existingEmail = await usersService.findByEmail(body.email)
  if (existingEmail && existingEmail.id !== admin.id) {
    throw createError({ statusCode: 409, message: '该邮箱已被注册' })
  }

  const existingUsername = await usersService.findByUsername(body.username)
  if (existingUsername && existingUsername.id !== admin.id) {
    throw createError({ statusCode: 409, message: '该用户名已被占用' })
  }

  const updated = await usersService.updateUser(admin.id, {
    username: body.username,
    email: body.email
  })

  await operationLogService.addLog({
    userId: admin.id,
    actor: admin.username,
    action: ADMIN_PROFILE_ONBOARDING_UPDATE_ACTION,
    resourceType: 'user',
    resourceId: admin.id,
    ...readRequestMeta(event),
    detail: {
      patch: {
        username: body.username,
        email: body.email
      }
    }
  })

  const { passwordHash: _passwordHash, ...safe } = updated
  return safe
})
