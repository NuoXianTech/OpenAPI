import { announcementService } from '~~/server/service/announcementService'

export default defineEventHandler(async () => {
  const data = await announcementService.listPublic()
  return { code: 0, msg: 'ok', data }
})
