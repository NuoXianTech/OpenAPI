import type { H3Event } from 'h3'
import { requireAdmin } from '~~/server/utils/auth'
import { siteSettingsService } from '~~/server/service/siteSettingsService'

export default defineEventHandler(async (event: H3Event) => {
  await requireAdmin(event)

  const data = await siteSettingsService.getForAdmin()

  return data
})
