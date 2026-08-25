import { platformRouteService } from '~~/server/services/platform-route-service'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { toPlatformRouteBinding } from '~~/server/utils/platform-view'

export default defineAdminEventHandler(async () => (
  (await platformRouteService.list()).map(toPlatformRouteBinding)
))
