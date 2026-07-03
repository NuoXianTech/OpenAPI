import type { H3Event } from 'h3'
import { announcementService } from '~~/server/services/announcement-service'
import { requireAdmin } from '~~/server/utils/auth'

export default defineEventHandler(async (event: H3Event) => {
  await requireAdmin(event)
  const data = await announcementService.listAll()
  return data
})
