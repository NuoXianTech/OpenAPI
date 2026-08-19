import { setResponseStatus } from 'h3'
import { applyWorkspaceRevision } from '~~/server/services/platform-endpoint-publication-service'
import { platformProductService } from '~~/server/services/platform-product-service'
import { addRequestOperationLog } from '~~/server/utils/request-operation-log'
import { readUuidRouterParam } from '~~/server/utils/router-param'
import { defineAdminEventHandler } from '~~/server/utils/auth'

export default defineAdminEventHandler(async (event, admin) => {
  const id = readUuidRouterParam(event)
  const removed = await platformProductService.removeVersion(id)
  const publication = await applyWorkspaceRevision(removed.workspaceId, admin.id)
  if (!publication.applied) setResponseStatus(event, 202)
  await addRequestOperationLog(event, {
    userId: admin.id,
    actor: admin.username,
    action: 'admin.platform.version.delete',
    resourceType: 'api-version',
    resourceId: id,
    detail: { version: removed.version.version, applied: publication.applied, publicationError: publication.publicationError }
  })
  return { id, ...publication }
})
