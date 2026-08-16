import { setResponseStatus } from 'h3'
import { adminPublishServiceEndpointSchema } from '~~/server/schemas/admin'
import { platformEndpointCatalogService } from '~~/server/services/platform-endpoint-catalog-service'
import { addRequestOperationLog } from '~~/server/utils/request-operation-log'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { readZodBody } from '~~/server/utils/zod'

export default defineAdminEventHandler(async (event, admin) => {
  const body = await readZodBody(event, adminPublishServiceEndpointSchema)
  const result = await platformEndpointCatalogService.publish(body, admin.id)
  if (!result.applied) setResponseStatus(event, 202)
  await addRequestOperationLog(event, {
    userId: admin.id,
    actor: admin.username,
    action: 'admin.platform.endpoint.publish',
    resourceType: 'api-route',
    resourceId: result.route.id,
    detail: {
      upstreamServiceId: body.upstreamServiceId,
      method: body.method,
      servicePath: body.path,
      applied: result.applied,
      revisionId: result.revision?.id ?? null,
      revisionSequence: result.revision?.sequence ?? null,
      publicationError: result.publicationError,
      created: result.created
    }
  })
  return result
})
