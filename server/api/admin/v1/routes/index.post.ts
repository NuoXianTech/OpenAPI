import { adminRouteSchema } from '~~/server/schemas/admin'
import { platformRouteService } from '~~/server/services/platform-route-service'
import { addRequestOperationLog } from '~~/server/utils/request-operation-log'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { readZodBody } from '~~/server/utils/zod'
import { toPlatformRoute } from '~~/server/utils/platform-view'

export default defineAdminEventHandler(async (event, admin) => {
  const body = await readZodBody(event, adminRouteSchema)
  const result = await platformRouteService.createAndPublish(body, admin.id)
  const created = result.route
  await addRequestOperationLog(event, {
    userId: admin.id,
    actor: admin.username,
    action: 'admin.platform.route.create',
    resourceType: 'api-route',
    resourceId: created?.id,
    detail: { method: created?.method, pathPattern: created?.pathPattern }
  })
  return {
    ...toPlatformRoute(created),
    revisions: result.revisions
  }
})
