import type { H3Event } from 'h3'
import { friendLinkService } from '~~/server/service/friendLinkService'

export default defineEventHandler(async (_event: H3Event) => {
  const list = await friendLinkService.listPublic()

  return {
    code: 0,
    msg: 'ok',
    data: list,
  }
})
