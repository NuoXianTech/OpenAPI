import { getQuery } from 'h3'
import { z } from 'zod'
import { platformUpstreamService } from '~~/server/services/platform-upstream-service'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { toPlatformUpstream } from '~~/server/utils/platform-view'

const optionalWorkspaceId = z.uuid().optional()

export default defineAdminEventHandler(async (event) => {
  const parsed = optionalWorkspaceId.safeParse(getQuery(event).workspaceId)
  return (await platformUpstreamService.list(
    parsed.success ? parsed.data : undefined,
    { checkAvailability: true }
  )).map(toPlatformUpstream)
})
