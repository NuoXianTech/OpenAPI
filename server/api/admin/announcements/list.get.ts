import type { H3Event } from 'h3'
import { announcementService } from '~~/server/services/announcement-service'
import { defineAdminEventHandler } from '~~/server/utils/auth'

export default defineAdminEventHandler(async (_event: H3Event) => {
  const data = await announcementService.listAll()
  return data
})
