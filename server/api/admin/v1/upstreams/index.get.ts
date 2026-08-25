import { z } from 'zod'
import { platformUpstreamService } from '~~/server/services/platform-upstream-service'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { toPlatformUpstream } from '~~/server/utils/platform-view'
import { parseZodQuery } from '~~/server/utils/zod'

const querySchema = z.object({ workspaceId: z.uuid().optional() })

export default defineAdminEventHandler(async (event) => {
  const { workspaceId } = parseZodQuery(event, querySchema)
  return (await platformUpstreamService.list(
    workspaceId,
    { checkAvailability: true }
  )).map(toPlatformUpstream)
})
