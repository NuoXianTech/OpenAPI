import { platformRouteService } from '~~/server/services/platform-route-service'
import { addRequestOperationLog } from '~~/server/utils/request-operation-log'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { readUuidRouterParam } from '~~/server/utils/router-param'

export default defineAdminEventHandler(async (event, admin) => {
  const routeId = readUuidRouterParam(event)

  const result = await platformRouteService.removeAndPublish(
    routeId,
    admin.id
  )
  const removed = result.route
  await addRequestOperationLog(event, {
    userId: admin.id,
    actor: admin.username,
    action: 'admin.platform.route.delete',
    resourceType: 'api-route',
    resourceId: removed.id,
    detail: { method: removed.method, pathPattern: removed.pathPattern }
  })
  return {
    id: removed.id,
    revision: result.revision
  }
})
