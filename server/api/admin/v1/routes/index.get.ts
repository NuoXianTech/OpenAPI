import { z } from 'zod'
import { platformRouteService } from '~~/server/services/platform-route-service'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { toPlatformRouteBinding } from '~~/server/utils/platform-view'
import { parseZodQuery } from '~~/server/utils/zod'

const querySchema = z.object({ workspaceId: z.uuid().optional() })

export default defineAdminEventHandler(async (event) => {
  const { workspaceId } = parseZodQuery(event, querySchema)
  return (await platformRouteService.list(workspaceId)).map(toPlatformRouteBinding)
})
