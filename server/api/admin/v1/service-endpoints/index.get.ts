import { getQuery } from 'h3'
import { z } from 'zod'
import { platformEndpointCatalogService } from '~~/server/services/platform-endpoint-catalog-service'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { toPlatformEndpointCatalog } from '~~/server/utils/platform-view'

const querySchema = z.object({
  workspaceId: z.uuid(),
  environmentId: z.uuid()
})

export default defineAdminEventHandler(async (event) => {
  const query = querySchema.parse(getQuery(event))
  return toPlatformEndpointCatalog(await platformEndpointCatalogService.list(
    query.workspaceId,
    query.environmentId
  ))
})
