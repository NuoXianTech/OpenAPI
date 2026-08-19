import { createError, getRouterParam } from 'h3'
import { z } from 'zod'
import { adminUpdateEndpointPublicationSchema } from '~~/server/schemas/admin'
import { platformEndpointCatalogService } from '~~/server/services/platform-endpoint-catalog-service'
import { addRequestOperationLog } from '~~/server/utils/request-operation-log'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { readZodBody } from '~~/server/utils/zod'

export default defineAdminEventHandler(async (event, admin) => {
  const routeId = z.uuid().safeParse(getRouterParam(event, 'id'))
  if (!routeId.success) {
    throw createError({ statusCode: 400, message: 'route id is invalid' })
  }
  const body = await readZodBody(
    event,
    adminUpdateEndpointPublicationSchema
  )
  const result = await platformEndpointCatalogService.update(
    routeId.data,
    body,
    admin.id
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
      environmentId: body.environmentId,
      enabled: body.enabled,
      isApiKey: body.isApiKey,
      isStatistics: body.isStatistics,
      revisionId: result.revision?.id ?? null,
      revisionSequence: result.revision?.sequence ?? null
    }
  })
  return result
})
