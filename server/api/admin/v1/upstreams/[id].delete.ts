import { setResponseStatus } from 'h3'
import { applyWorkspaceRevision } from '~~/server/services/platform-endpoint-publication-service'
import { platformUpstreamService } from '~~/server/services/platform-upstream-service'
import { addRequestOperationLog } from '~~/server/utils/request-operation-log'
import { readUuidRouterParam } from '~~/server/utils/router-param'
import { defineAdminEventHandler } from '~~/server/utils/auth'

export default defineAdminEventHandler(async (event, admin) => {
  const id = readUuidRouterParam(event)
  const removed = await platformUpstreamService.remove(id)
  if (!removed) throw new Error('upstream delete returned no row')
  const publication = await applyWorkspaceRevision(removed.workspaceId, admin.id)
  if (!publication.applied) setResponseStatus(event, 202)
  await addRequestOperationLog(event, {
    userId: admin.id,
    actor: admin.username,
    action: 'admin.platform.upstream.delete',
    resourceType: 'upstream-service',
    resourceId: id,
    detail: { slug: removed.slug, applied: publication.applied, publicationError: publication.publicationError }
  })
  return { id, ...publication }
})
