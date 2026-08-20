import { getQuery } from 'h3'
import { z } from 'zod'
import { platformRouteService } from '~~/server/services/platform-route-service'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { toPlatformRouteBinding } from '~~/server/utils/platform-view'

const optionalWorkspaceId = z.uuid().optional()

export default defineAdminEventHandler(async (event) => {
  const parsed = optionalWorkspaceId.safeParse(getQuery(event).workspaceId)
  return (await platformRouteService.list(parsed.success ? parsed.data : undefined))
    .map(toPlatformRouteBinding)
})
