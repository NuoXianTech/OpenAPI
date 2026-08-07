import { createError } from 'h3'
import { adminCreateUserSchema } from '~~/server/schemas/admin'
import { userService } from '~~/server/services/user-service'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { hashPassword } from '~~/server/utils/password'
import { addRequestOperationLog } from '~~/server/utils/request-operation-log'
import { readZodBody } from '~~/server/utils/zod'

export default defineAdminEventHandler(async (event, admin) => {
  const { username, email, password, displayName, role, isActive } = await readZodBody(event, adminCreateUserSchema)

  if (await userService.findByEmail(email)) {
    throw createError({ statusCode: 409, message: '该邮箱已被注册' })
  }
  if (await userService.findByUsername(username)) {
    throw createError({ statusCode: 409, message: '该用户名已被占用' })
  }

  const passwordHash = await hashPassword(password)

  const created = await userService.addUser({
    role,
    username,
    email,
    passwordHash,
    displayName: displayName || undefined,
    isActive: isActive ?? true
  })

  await addRequestOperationLog(event, {
    userId: admin.id,
    actor: admin.username,
    action: 'admin.user.create',
    resourceType: 'user',
    resourceId: created.id,
    detail: { username: created.username, email: created.email, role: created.role, isActive: created.isActive }
  })

  const { passwordHash: _, ...safe } = created
  return safe
})
