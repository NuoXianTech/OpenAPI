import { createError } from 'h3'
import { ADMIN_PROFILE_ONBOARDING_UPDATE_ACTION, needsInitialAdminProfileSetup } from '#shared/config/admin-defaults'
import { adminInitialProfileSchema } from '~~/server/schemas/admin'
import { addRequestOperationLog } from '~~/server/utils/request-operation-log'
import { userService } from '~~/server/services/user-service'
import { adminUserService } from '~~/server/services/admin-user-service'
import { createUserSession, defineAdminEventHandler } from '~~/server/utils/auth'
import { hashPassword } from '~~/server/utils/password'
import { readZodBody } from '~~/server/utils/zod'

export default defineAdminEventHandler(async (event, admin) => {
  const body = await readZodBody(event, adminInitialProfileSchema)
  if (needsInitialAdminProfileSetup(body)) {
    throw createError({
      statusCode: 400,
      message: '初始用户名和邮箱都必须修改',
      data: { code: 'INITIAL_ADMIN_IDENTITY_UNCHANGED' }
    })
  }
  const current = await userService.getById(admin.id)

  if (!current) {
    throw createError({ statusCode: 404, message: '管理员账号不存在' })
  }

  const existingEmail = await userService.findByEmail(body.email)
  if (existingEmail && existingEmail.id !== admin.id) {
    throw createError({ statusCode: 409, message: '该邮箱已被注册' })
  }

  const existingUsername = await userService.findByUsername(body.username)
  if (existingUsername && existingUsername.id !== admin.id) {
    throw createError({ statusCode: 409, message: '该用户名已被占用' })
  }

  const updated = await adminUserService.updateUser(admin.id, {
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
