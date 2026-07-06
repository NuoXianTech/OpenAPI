import type { H3Event } from 'h3'
import { idSchema } from '~~/server/schemas/common'
import { notificationService } from '~~/server/services/notification-service'
import { requireAuth } from '~~/server/utils/auth'
import { readZodBody } from '~~/server/utils/zod'

export default defineEventHandler(async (event: H3Event) => {
  const user = await requireAuth(event)
  const { id } = await readZodBody(event, idSchema)

  const updated = await notificationService.markRead(user.id, id)
  return updated
})
