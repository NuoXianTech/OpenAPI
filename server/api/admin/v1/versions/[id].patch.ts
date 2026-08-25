import { adminUpdateVersionSchema } from '~~/server/schemas/admin'
import { platformProductService } from '~~/server/services/platform-product-service'
import { addRequestOperationLog } from '~~/server/utils/request-operation-log'
import { readUuidRouterParam } from '~~/server/utils/router-param'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { readZodBody } from '~~/server/utils/zod'
import { toPlatformApiVersion } from '~~/server/utils/platform-view'

export default defineAdminEventHandler(async (event, admin) => {
  const id = readUuidRouterParam(event)
  const body = await readZodBody(event, adminUpdateVersionSchema)
  const result = await platformProductService.updateVersionAndPublish(
    id,
    body,
    admin.id
  )
  const updated = result.version
  await addRequestOperationLog(event, {
    userId: admin.id,
    actor: admin.username,
    action: 'admin.platform.version.update',
    resourceType: 'api-version',
    resourceId: id,
    detail: { patch: body }
  })
  return {
    ...toPlatformApiVersion(updated),
    revision: result.revision
  }
})
