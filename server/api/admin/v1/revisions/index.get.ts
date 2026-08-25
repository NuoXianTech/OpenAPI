import { z } from 'zod'
import { routingRevisionService } from '~~/server/services/routing-revision-service'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { toPlatformRoutingRevision } from '~~/server/utils/platform-view'
import { parseZodQuery } from '~~/server/utils/zod'

const querySchema = z.object({ environmentId: z.uuid().optional() })

export default defineAdminEventHandler(async (event) => {
  const { environmentId } = parseZodQuery(event, querySchema)
  return (await routingRevisionService.list(environmentId)).map(toPlatformRoutingRevision)
})
