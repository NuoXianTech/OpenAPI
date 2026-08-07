import { createError } from 'h3'
import { ADMIN_PROFILE_ONBOARDING_UPDATE_ACTION } from '#shared/config/admin-defaults'
import { adminInitialProfileSchema } from '~~/server/schemas/admin'
import { addRequestOperationLog } from '~~/server/utils/request-operation-log'
import { usersService } from '~~/server/services/user-service'
import { createUserSession, defineAdminEventHandler, hashPassword } from '~~/server/utils/auth'
import { readZodBody } from '~~/server/utils/zod'

export default defineAdminEventHandler(async (event, admin) => {
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
    email: body.email,
    passwordHash: await hashPassword(body.password)
  })
  if (!updated) {
    throw createError({ statusCode: 404, message: '管理员账号不存在' })
  }
  await createUserSession(event, { id: admin.id, role: admin.role })

  await addRequestOperationLog(event, {
    userId: admin.id,
    actor: admin.username,
    action: ADMIN_PROFILE_ONBOARDING_UPDATE_ACTION,
    resourceType: 'user',
    resourceId: admin.id,
    detail: {
      patch: {
        username: body.username,
        email: body.email,
        passwordChanged: true
      }
    }
  })

  const { passwordHash: _passwordHash, tokenVersion: _tokenVersion, ...safe } = updated
  return safe
})
