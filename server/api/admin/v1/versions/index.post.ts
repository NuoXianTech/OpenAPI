import { setResponseStatus } from 'h3'
import { adminCreateVersionSchema } from '~~/server/schemas/admin'
import { applyWorkspaceRevision } from '~~/server/services/platform-endpoint-publication-service'
import { platformProductService } from '~~/server/services/platform-product-service'
import { addRequestOperationLog } from '~~/server/utils/request-operation-log'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { readZodBody } from '~~/server/utils/zod'

export default defineAdminEventHandler(async (event, admin) => {
  const body = await readZodBody(event, adminCreateVersionSchema)
  const created = await platformProductService.createVersion(body)
  const publication = await applyWorkspaceRevision(created.workspaceId, admin.id)
  if (!publication.applied) setResponseStatus(event, 202)
  await addRequestOperationLog(event, {
    userId: admin.id,
    actor: admin.username,
    action: 'admin.platform.version.create',
    resourceType: 'api-version',
    resourceId: created.version.id,
    detail: { productId: body.productId, version: created.version.version, applied: publication.applied, publicationError: publication.publicationError }
  })
  return { ...created.version, ...publication }
})
