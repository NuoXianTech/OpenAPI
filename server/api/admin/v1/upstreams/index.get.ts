import { getQuery } from 'h3'
import { z } from 'zod'
import { platformUpstreamService } from '~~/server/services/platform-upstream-service'
import { defineAdminEventHandler } from '~~/server/utils/auth'

const optionalWorkspaceId = z.uuid().optional()

export default defineAdminEventHandler((event) => {
  const parsed = optionalWorkspaceId.safeParse(getQuery(event).workspaceId)
  return platformUpstreamService.list(parsed.success ? parsed.data : undefined)
})
