import { createError } from 'h3'
import { userUpdatePreferencesSchema } from '~~/server/schemas/user'
import { userService } from '~~/server/services/user-service'
import { addRequestOperationLog } from '~~/server/utils/request-operation-log'
import { defineAuthenticatedEventHandler } from '~~/server/utils/auth'
import { readZodBody } from '~~/server/utils/zod'

export default defineAuthenticatedEventHandler(async (event, authUser) => {
  const preferences = await readZodBody(event, userUpdatePreferencesSchema)
  const updated = await userService.updateProfile(authUser.id, preferences)
  if (!updated) {
    throw createError({ statusCode: 404, message: '用户不存在' })
  }

  await addRequestOperationLog(event, {
    userId: authUser.id,
    actor: authUser.username,
    action: 'user.preferences.update',
    resourceType: 'user',
    resourceId: authUser.id,
    detail: { fields: Object.keys(preferences) }
  })

  return { locale: updated.locale }
})
