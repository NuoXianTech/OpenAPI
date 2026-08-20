import { adminCreateVersionSchema } from '~~/server/schemas/admin'
import { platformProductService } from '~~/server/services/platform-product-service'
import { addRequestOperationLog } from '~~/server/utils/request-operation-log'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { readZodBody } from '~~/server/utils/zod'
import { toPlatformApiVersion } from '~~/server/utils/platform-view'

export default defineAdminEventHandler(async (event, admin) => {
  const body = await readZodBody(event, adminCreateVersionSchema)
  const result = await platformProductService.createVersionAndPublish(
    body,
    admin.id
  )
  const created = result.version
  await addRequestOperationLog(event, {
    userId: admin.id,
    actor: admin.username,
    action: 'admin.platform.version.create',
    resourceType: 'api-version',
    resourceId: created.id,
    detail: { productId: body.productId, version: created.version }
  })
  return {
    ...toPlatformApiVersion(created),
    revisions: result.revisions
  }
})
