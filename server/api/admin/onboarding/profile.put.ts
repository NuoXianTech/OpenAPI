import { createError } from 'h3'
import { ADMIN_PROFILE_ONBOARDING_UPDATE_ACTION } from '#shared/config/admin-defaults'
import { adminInitialProfileSchema } from '~~/server/schemas/admin'
import { addRequestOperationLog } from '~~/server/utils/request-operation-log'
import { userService } from '~~/server/services/user-service'
import { adminUserService } from '~~/server/services/admin-user-service'
import { createUserSession, defineAdminEventHandler } from '~~/server/utils/auth'
import { hashPassword } from '~~/server/utils/password'
import { readZodBody } from '~~/server/utils/zod'

export default defineAdminEventHandler(async (event, admin) => {
  const body = await readZodBody(event, adminInitialProfileSchema)

  const current = await userService.getById(admin.id)
  if (!current) {
    throw createError({ statusCode: 404, message: '管理员账号不存在' })
  }

  // 用户名与邮箱可以保持默认：留空即沿用当前值，只有密码是必须轮换的。
  const username = body.username?.trim() || current.username
  const email = body.email?.trim().toLowerCase() || current.email

  if (email !== current.email) {
    const existingEmail = await userService.findByEmail(email)
    if (existingEmail && existingEmail.id !== admin.id) {
      throw createError({ statusCode: 409, message: '该邮箱已被注册' })
    }
  }

  if (username !== current.username) {
    const existingUsername = await userService.findByUsername(username)
    if (existingUsername && existingUsername.id !== admin.id) {
      throw createError({ statusCode: 409, message: '该用户名已被占用' })
    }
  }

  const updated = await adminUserService.updateUser(admin.id, {
    username,
    email,
    passwordHash: await hashPassword(body.password)
  })
  if (!updated) {
    throw createError({ statusCode: 404, message: '管理员账号不存在' })
  }
  await createUserSession(event, { id: admin.id, role: admin.role })

  // actor 用改名后的用户名。这条审计记录的对象就是这次改名本身，
  // 若沿用会话里的旧快照，后台会显示成「admin 改了自己的名字」，
  // 而此后所有记录都是新名字——这个断层没有追溯价值。旧名字进 detail 保留。
  await addRequestOperationLog(event, {
    userId: admin.id,
    actor: updated.username,
    action: ADMIN_PROFILE_ONBOARDING_UPDATE_ACTION,
    resourceType: 'user',
    resourceId: admin.id,
    detail: {
      previous: {
        username: current.username,
        email: current.email
      },
      patch: {
        usernameChanged: username !== current.username,
        emailChanged: email !== current.email,
        passwordChanged: true
      }
    }
  })

  const { passwordHash: _passwordHash, tokenVersion: _tokenVersion, ...safe } = updated
  return safe
})
