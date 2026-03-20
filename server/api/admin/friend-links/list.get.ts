import type { H3Event } from 'h3'
import { friendLinkService } from '~~/server/service/friendLinkService'
import { requireAdmin } from '~~/server/utils/auth'

export default defineEventHandler(async (event: H3Event) => {
  await requireAdmin(event)
  const list = await friendLinkService.list()
  return {
    code: 0,
    msg: 'ok',
    data: list,
  }
})
