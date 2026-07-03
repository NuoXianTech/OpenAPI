import type { H3Event } from 'h3'
import { friendLinkService } from '~~/server/services/friend-link-service'
import { requireAdmin } from '~~/server/utils/auth'

export default defineEventHandler(async (event: H3Event) => {
  await requireAdmin(event)
  const list = await friendLinkService.list()
  return list
})
