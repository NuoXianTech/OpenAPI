import { getQuery } from 'h3'
import { z } from 'zod'
import { platformProductService } from '~~/server/services/platform-product-service'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { toPlatformProduct } from '~~/server/utils/platform-view'

const optionalWorkspaceId = z.uuid().optional()

export default defineAdminEventHandler(async (event) => {
  const parsed = optionalWorkspaceId.safeParse(getQuery(event).workspaceId)
  return (await platformProductService.list(parsed.success ? parsed.data : undefined))
    .map(toPlatformProduct)
})
