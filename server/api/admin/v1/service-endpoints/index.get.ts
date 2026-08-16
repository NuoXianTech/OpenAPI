import { getQuery } from 'h3'
import { z } from 'zod'
import { platformEndpointCatalogService } from '~~/server/services/platform-endpoint-catalog-service'
import { defineAdminEventHandler } from '~~/server/utils/auth'

const querySchema = z.object({
  workspaceId: z.uuid(),
  environmentId: z.uuid()
})

export default defineAdminEventHandler((event) => {
  const query = querySchema.parse(getQuery(event))
  return platformEndpointCatalogService.list(
    query.workspaceId,
    query.environmentId
  )
})
