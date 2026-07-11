import type { H3Event } from 'h3'
import { idSchema } from '~~/server/schemas/common'
import { notificationService } from '~~/server/services/notification-service'
import { defineAuthenticatedEventHandler } from '~~/server/utils/auth'
import { readZodBody } from '~~/server/utils/zod'

export default defineAuthenticatedEventHandler(async (event: H3Event, user) => {
  const { id } = await readZodBody(event, idSchema)

  const updated = await notificationService.markRead(user.id, id)
  return updated
})
