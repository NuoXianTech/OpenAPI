import { announcementService } from '~~/server/services/announcement-service'

export default defineEventHandler(async () => {
  const data = await announcementService.listPublic()
  return data
})
