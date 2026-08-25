import { platformUpstreamService } from '~~/server/services/platform-upstream-service'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { toPlatformUpstream } from '~~/server/utils/platform-view'

export default defineAdminEventHandler(async () => (
  (await platformUpstreamService.list({ checkAvailability: true }))
    .map(toPlatformUpstream)
))
