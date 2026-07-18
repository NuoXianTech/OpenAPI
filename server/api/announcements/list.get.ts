import { announcementService } from '~~/server/services/announcement-service'

export default defineEventHandler(() => announcementService.listPublic())
