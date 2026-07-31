import { systemSettingsService } from '~~/server/services/system-settings-service'

export default defineEventHandler(() => systemSettingsService.getPublicSettings())
