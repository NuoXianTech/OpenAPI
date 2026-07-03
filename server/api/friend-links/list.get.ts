import type { H3Event } from 'h3'
import { friendLinkService } from '~~/server/services/friend-link-service'

export default defineEventHandler(async (_event: H3Event) => {
  const list = await friendLinkService.listPublic()

  return list
})
