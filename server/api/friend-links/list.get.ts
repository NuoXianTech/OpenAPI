import { friendLinkService } from '~~/server/services/friend-link-service'

export default defineEventHandler(async () => {
  const list = await friendLinkService.listPublic()

  return list
})
