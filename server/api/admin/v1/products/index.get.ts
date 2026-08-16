import { getQuery } from 'h3'
import { z } from 'zod'
import { platformProductService } from '~~/server/services/platform-product-service'
import { defineAdminEventHandler } from '~~/server/utils/auth'

const optionalWorkspaceId = z.uuid().optional()

export default defineAdminEventHandler((event) => {
  const parsed = optionalWorkspaceId.safeParse(getQuery(event).workspaceId)
  return platformProductService.list(parsed.success ? parsed.data : undefined)
})
