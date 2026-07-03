import type { H3Event } from 'h3'
import { siteSettingsService } from '~~/server/services/site-settings-service'

export default defineEventHandler(async (_event: H3Event) => {
  const data = await siteSettingsService.getPublicSettings()

  return data
})
