import { z } from 'zod'
import { getQuery } from 'h3'
import { routingRevisionService } from '~~/server/services/routing-revision-service'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { toPlatformRoutingRevision } from '~~/server/utils/platform-view'

const optionalEnvironmentId = z.uuid().optional()

export default defineAdminEventHandler(async (event) => {
  const parsed = optionalEnvironmentId.safeParse(getQuery(event).environmentId)
  return (await routingRevisionService.list(parsed.success ? parsed.data : undefined))
    .map(toPlatformRoutingRevision)
})
