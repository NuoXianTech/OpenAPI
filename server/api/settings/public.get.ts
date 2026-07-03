import { siteSettingsService } from '~~/server/services/site-settings-service'

export default defineEventHandler(async () => {
  const data = await siteSettingsService.getPublicSettings()

  return data
})
