import type { H3Event } from 'h3'
import { siteSettingsService } from '~~/server/service/siteSettingsService'

export default defineEventHandler(async (_event: H3Event) => {
  const data = await siteSettingsService.getPublicSettings()

  return data
})
