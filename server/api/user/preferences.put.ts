import { createError } from 'h3'
import { userUpdatePreferencesSchema } from '~~/server/schemas/user'
import { usersService } from '~~/server/services/user-service'
import { defineAuthenticatedEventHandler } from '~~/server/utils/auth'
import { readZodBody } from '~~/server/utils/zod'

export default defineAuthenticatedEventHandler(async (event, authUser) => {
  const preferences = await readZodBody(event, userUpdatePreferencesSchema)
  const updated = await usersService.updateUser(authUser.id, preferences)
  if (!updated) {
    throw createError({ statusCode: 404, message: '用户不存在' })
  }

  return { locale: updated.locale }
})
