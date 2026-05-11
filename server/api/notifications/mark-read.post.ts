import type { H3Event } from 'h3'
import { createError, readBody } from 'h3'
import { notificationService } from '~~/server/service/notificationService'
import { requireAuth } from '~~/server/utils/auth'

export default defineEventHandler(async (event: H3Event) => {
  const user = await requireAuth(event)
  const body = await readBody(event) as Record<string, unknown>
  const id = Number(body.id)
  if (!id) throw createError({ statusCode: 400, message: 'id is required' })

  const updated = await notificationService.markRead(user.id, id)
  return updated
})
