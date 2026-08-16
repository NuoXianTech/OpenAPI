import { getQuery } from 'h3'
import { z } from 'zod'
import { platformRouteService } from '~~/server/services/platform-route-service'
import { defineAdminEventHandler } from '~~/server/utils/auth'

const optionalWorkspaceId = z.uuid().optional()

export default defineAdminEventHandler((event) => {
  const parsed = optionalWorkspaceId.safeParse(getQuery(event).workspaceId)
  return platformRouteService.list(parsed.success ? parsed.data : undefined)
})
