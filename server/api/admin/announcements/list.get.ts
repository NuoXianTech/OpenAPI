import { announcementService } from '~~/server/services/announcement-service'
import { defineAdminEventHandler } from '~~/server/utils/auth'

export default defineAdminEventHandler(() => announcementService.listAll())
