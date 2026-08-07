// 用户更新自己的非敏感资料：displayName
import { createError } from 'h3'
import { userUpdateProfileSchema } from '~~/server/schemas/user'
import { userService } from '~~/server/services/user-service'
import { addRequestOperationLog } from '~~/server/utils/request-operation-log'
import { defineAuthenticatedEventHandler } from '~~/server/utils/auth'
import { readZodBody } from '~~/server/utils/zod'

export default defineAuthenticatedEventHandler(async (event, authUser) => {
  const { displayName } = await readZodBody(event, userUpdateProfileSchema)

  const updated = await userService.updateProfile(authUser.id, {
    displayName: displayName || null
  })
  if (!updated) {
    throw createError({ statusCode: 404, message: '用户不存在' })
  }

  await addRequestOperationLog(event, {
    userId: authUser.id,
    actor: authUser.username,
    action: 'user.profile.update',
    resourceType: 'user',
    resourceId: authUser.id,
    detail: { fields: ['displayName'] }
  })

  const { passwordHash: _ph, ...safe } = updated
  return safe
})
