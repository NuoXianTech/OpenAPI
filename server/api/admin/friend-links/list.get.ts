import type { H3Event } from 'h3'
import { friendLinkService } from '~~/server/services/friend-link-service'
import { defineAdminEventHandler } from '~~/server/utils/auth'

export default defineAdminEventHandler(async (_event: H3Event) => {
  const list = await friendLinkService.list()
  return list
})
