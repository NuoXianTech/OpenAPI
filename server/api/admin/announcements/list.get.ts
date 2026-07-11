import type { H3Event } from 'h3'
import { announcementService } from '~~/server/services/announcement-service'
import { defineAdminEventHandler } from '~~/server/utils/auth'

export default defineAdminEventHandler((_event: H3Event) => {
  return announcementService.listAll()
})
