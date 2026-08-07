import { adminCleanupOperationLogsSchema } from '~~/server/schemas/admin'
import { operationLogService } from '~~/server/services/operation-log-service'
import { addRequestOperationLog } from '~~/server/utils/request-operation-log'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { readZodBody } from '~~/server/utils/zod'

export default defineAdminEventHandler(async (event, admin) => {
  const body = await readZodBody(event, adminCleanupOperationLogsSchema)
  const { confirm: _confirm, deleteAll = false, ...filters } = body
  const affected = await operationLogService.deleteMatching(filters)

  await addRequestOperationLog(event, {
    userId: admin.id,
    actor: admin.username,
    action: 'admin.operation-log.cleanup',
    resourceType: 'operation-log',
    resourceId: deleteAll ? 'all' : 'filtered',
    detail: { filters, affected }
  })

  return { affected }
})
