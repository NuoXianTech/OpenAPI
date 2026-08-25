import { routingRevisionService } from '~~/server/services/routing-revision-service'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { toPlatformRoutingRevision } from '~~/server/utils/platform-view'

export default defineAdminEventHandler(async () => (
  (await routingRevisionService.list()).map(toPlatformRoutingRevision)
))
