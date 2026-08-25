import { platformRuntimeService } from '~~/server/services/platform-runtime-service'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { toPlatformRuntime } from '~~/server/utils/platform-view'

export default defineAdminEventHandler(async () => (
  toPlatformRuntime(await platformRuntimeService.get())
))
