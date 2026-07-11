import { siteSettingsService } from '~~/server/services/site-settings-service'

export default defineEventHandler(() => {
  return siteSettingsService.getPublicSettings()
})
