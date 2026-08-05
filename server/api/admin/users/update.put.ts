import { createError } from 'h3'
import { adminUpdateUserSchema } from '~~/server/schemas/admin'
import { usersService } from '~~/server/services/user-service'
import { defineAdminEventHandler, hashPassword } from '~~/server/utils/auth'
import { operationLogService } from '~~/server/services/operation-log-service'
import { readZodBody } from '~~/server/utils/zod'

export default defineAdminEventHandler(async (event, admin) => {
  const { id, email, displayName, role, isActive, isBanned, password } = await readZodBody(event, adminUpdateUserSchema)
  const target = await usersService.getById(id)
  if (!target) {
    throw createError({ statusCode: 404, message: 'user not found' })
  }

  const willRemoveAdminAccess = usersService.willRemoveAdminAccess(target, { role, isActive, isBanned })
  if (admin.id === id && willRemoveAdminAccess) {
    throw createError({ statusCode: 400, message: '不能移除当前登录管理员的管理权限' })
  }
  if (email !== undefined) {
    const existing = await usersService.findByEmail(email)
    if (existing && existing.id !== id) {
      throw createError({ statusCode: 409, message: '该邮箱已被注册' })
    }
  }

  // 提供 password 才重置；否则 passwordHash 保持 undefined，drizzle 不会触碰该列
  const passwordHash = password ? await hashPassword(password) : undefined

  const updated = await usersService.updateUser(id, {
    role,
    email,
    displayName: displayName !== undefined ? (displayName || null) : undefined,
    isActive,
    isBanned,
    passwordHash
  })
  if (!updated) {
    throw createError({ statusCode: 404, message: 'user not found' })
  }
  await operationLogService.addRequestLog(event, {
    userId: admin.id,
    actor: admin.username,
    action: 'admin.user.update',
    resourceType: 'user',
    resourceId: id,
    // 仅记录是否改过密码，绝不落明文 / hash
    detail: { patch: { email, displayName, role, isActive, isBanned, passwordChanged: Boolean(password) } }
  })

  const { passwordHash: _ph, ...safe } = updated
  return safe
})
