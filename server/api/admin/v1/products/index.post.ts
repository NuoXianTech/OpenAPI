import { adminCreateProductSchema } from '~~/server/schemas/admin'
import { platformProductService } from '~~/server/services/platform-product-service'
import { addRequestOperationLog } from '~~/server/utils/request-operation-log'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { readZodBody } from '~~/server/utils/zod'
import { toPlatformProduct } from '~~/server/utils/platform-view'

export default defineAdminEventHandler(async (event, admin) => {
  const body = await readZodBody(event, adminCreateProductSchema)
  const created = await platformProductService.create(body)
  await addRequestOperationLog(event, {
    userId: admin.id,
    actor: admin.username,
    action: 'admin.platform.product.create',
    resourceType: 'api-product',
    resourceId: created.id,
    detail: { slug: created.slug, version: created.versions[0]?.version }
  })
  return toPlatformProduct(created)
})
