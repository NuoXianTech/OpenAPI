import { idSchema } from '~~/server/schemas/common'
import { notificationService } from '~~/server/services/notification-service'
import { defineAuthenticatedEventHandler } from '~~/server/utils/auth'
import { readZodBody } from '~~/server/utils/zod'

export default defineAuthenticatedEventHandler(async (event, user) => {
  const { id } = await readZodBody(event, idSchema)

  return notificationService.markRead(user.id, id)
})
