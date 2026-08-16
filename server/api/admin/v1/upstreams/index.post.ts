import { adminCreateUpstreamSchema } from '~~/server/schemas/admin'
import { platformUpstreamService } from '~~/server/services/platform-upstream-service'
import { addRequestOperationLog } from '~~/server/utils/request-operation-log'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { readZodBody } from '~~/server/utils/zod'

export default defineAdminEventHandler(async (event, admin) => {
  const body = await readZodBody(event, adminCreateUpstreamSchema)
  const created = await platformUpstreamService.create(body)
  await addRequestOperationLog(event, {
    userId: admin.id,
    actor: admin.username,
    action: 'admin.platform.upstream.create',
    resourceType: 'upstream-service',
    resourceId: created.id,
    detail: { slug: created.slug, kind: created.kind, targetCount: created.targets.length }
  })
  return created
})
