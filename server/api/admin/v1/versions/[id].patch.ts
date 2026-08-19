import { setResponseStatus } from 'h3'
import { adminUpdateVersionSchema } from '~~/server/schemas/admin'
import { applyWorkspaceRevision } from '~~/server/services/platform-endpoint-publication-service'
import { platformProductService } from '~~/server/services/platform-product-service'
import { addRequestOperationLog } from '~~/server/utils/request-operation-log'
import { readUuidRouterParam } from '~~/server/utils/router-param'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { readZodBody } from '~~/server/utils/zod'

export default defineAdminEventHandler(async (event, admin) => {
  const id = readUuidRouterParam(event)
  const body = await readZodBody(event, adminUpdateVersionSchema)
  const updated = await platformProductService.updateVersion(id, body)
  const publication = await applyWorkspaceRevision(updated.workspaceId, admin.id)
  if (!publication.applied) setResponseStatus(event, 202)
  await addRequestOperationLog(event, {
    userId: admin.id,
    actor: admin.username,
    action: 'admin.platform.version.update',
    resourceType: 'api-version',
    resourceId: id,
    detail: { patch: body, applied: publication.applied, publicationError: publication.publicationError }
  })
  return { ...updated.version, ...publication }
})
