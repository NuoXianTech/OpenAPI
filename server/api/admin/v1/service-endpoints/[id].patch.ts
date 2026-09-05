import { adminUpdateEndpointPublicationSchema } from '~~/server/schemas/admin'
import { platformEndpointCatalogService } from '~~/server/services/platform-endpoint-catalog-service'
import { platformRouteService } from '~~/server/services/platform-route-service'
import { addRequestOperationLog } from '~~/server/utils/request-operation-log'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { readUuidRouterParam } from '~~/server/utils/router-param'
import { readZodBody } from '~~/server/utils/zod'
import { toPlatformEndpointPublicationResult } from '~~/server/utils/platform-view'

export default defineAdminEventHandler(async (event, admin) => {
  const routeId = readUuidRouterParam(event)
  const body = await readZodBody(
    event,
    adminUpdateEndpointPublicationSchema
  )
  const binding = await platformRouteService.get(routeId)
  const result = await platformEndpointCatalogService.update(
    routeId,
    body,
    admin.id,
    { publishRouting: binding.route.managedBy !== 'service' }
  )
  await addRequestOperationLog(event, {
    userId: admin.id,
    actor: admin.username,
    action: body.enabled === false
      ? 'admin.platform.endpoint.unpublish'
      : 'admin.platform.endpoint.update',
    resourceType: 'api-route',
    resourceId: result.route.id,
    detail: {
      enabled: body.enabled,
      isApiKey: body.isApiKey,
      isStatistics: body.isStatistics,
      revisionId: result.revision?.id ?? null,
      revisionSequence: result.revision?.sequence ?? null
    }
  })
  return toPlatformEndpointPublicationResult(result)
})
