import type { H3Event } from 'h3'
import { requireAdmin } from '~~/server/utils/auth'
import { oauthProviderService } from '~~/server/service/oauthProviderService'

export default defineEventHandler(async (event: H3Event) => {
  await requireAdmin(event)
  const list = await oauthProviderService.list()
  return { code: 0, msg: 'ok', data: list }
})
