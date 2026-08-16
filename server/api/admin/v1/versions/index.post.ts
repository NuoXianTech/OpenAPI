import { adminCreateVersionSchema } from '~~/server/schemas/admin'
import { platformProductService } from '~~/server/services/platform-product-service'
import { routingRevisionService } from '~~/server/services/routing-revision-service'
import { addRequestOperationLog } from '~~/server/utils/request-operation-log'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { readZodBody } from '~~/server/utils/zod'

export default defineAdminEventHandler(async (event, admin) => {
  const body = await readZodBody(event, adminCreateVersionSchema)
  const created = await platformProductService.createVersion(body)
  await routingRevisionService.publishWorkspace(created.workspaceId, admin.id)
  await addRequestOperationLog(event, {
    userId: admin.id,
    actor: admin.username,
    action: 'admin.platform.version.create',
    resourceType: 'api-version',
    resourceId: created.version.id,
    detail: { productId: body.productId, version: created.version.version }
  })
  return created.version
})
