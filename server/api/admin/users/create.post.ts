import type { H3Event } from 'h3'
import { createError } from 'h3'
import { adminCreateUserSchema } from '~~/server/schemas/admin'
import { usersService } from '~~/server/services/user-service'
import { hashPassword, requireAdmin } from '~~/server/utils/auth'
import { operationLogService } from '~~/server/services/operation-log-service'
import { readRequestMeta } from '~~/server/utils/request-meta'
import { readZodBody } from '~~/server/utils/zod'

export default defineEventHandler(async (event: H3Event) => {
  const admin = await requireAdmin(event)
  const { username, email, password, displayName, isActive } = await readZodBody(event, adminCreateUserSchema)

  if (await usersService.findByEmail(email)) {
    throw createError({ statusCode: 409, message: '该邮箱已被注册' })
  }
  if (await usersService.findByUsername(username)) {
    throw createError({ statusCode: 409, message: '该用户名已被占用' })
  }

  const passwordHash = await hashPassword(password)

  const created = await usersService.addUser({
    username,
    email,
    passwordHash,
    displayName: displayName || undefined,
    isActive: isActive ?? true
  })

  await operationLogService.addLog({
    actor: admin.username,
    action: 'admin.user.create',
    resourceType: 'user',
    resourceId: created.id,
    ...readRequestMeta(event),
    detail: { username: created.username, email: created.email, isActive: created.isActive }
  })

  const { passwordHash: _, ...safe } = created
  return safe
})
