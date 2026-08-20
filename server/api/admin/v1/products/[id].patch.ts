import { adminUpdateProductSchema } from '~~/server/schemas/admin'
import { platformProductService } from '~~/server/services/platform-product-service'
import { addRequestOperationLog } from '~~/server/utils/request-operation-log'
import { readUuidRouterParam } from '~~/server/utils/router-param'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { readZodBody } from '~~/server/utils/zod'
import { toPlatformProductSummary } from '~~/server/utils/platform-view'

export default defineAdminEventHandler(async (event, admin) => {
  const id = readUuidRouterParam(event)
  const body = await readZodBody(event, adminUpdateProductSchema)
  const result = await platformProductService.updateAndPublish(id, body, admin.id)
  const updated = result.product
  await addRequestOperationLog(event, {
    userId: admin.id,
    actor: admin.username,
    action: 'admin.platform.product.update',
    resourceType: 'api-product',
    resourceId: id,
    detail: { patch: body }
  })
  return {
    ...toPlatformProductSummary(updated),
    revisions: result.revisions
  }
})
