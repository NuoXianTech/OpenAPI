import type { H3Event } from 'h3'
import { getQuery } from 'h3'
import { operationLogService, type OperationLogActorType, type OperationLogStatus } from '~~/server/service/operationLogService'
import { requireAdmin } from '~~/server/utils/auth'

const ACTOR_TYPES: OperationLogActorType[] = ['user', 'admin', 'system']
const STATUSES: OperationLogStatus[] = ['success', 'failure']

function parseDate(value: unknown): Date | undefined {
  if (!value) return undefined
  const date = new Date(String(value))
  return Number.isNaN(date.getTime()) ? undefined : date
}

export default defineEventHandler(async (event: H3Event) => {
  await requireAdmin(event)
  const query = getQuery(event)

  const actorTypeRaw = (query.actorType || '').toString()
  const statusRaw = (query.status || '').toString()

  const logs = await operationLogService.list({
    userId: query.userId ? Number(query.userId) : undefined,
    actorType: ACTOR_TYPES.includes(actorTypeRaw as OperationLogActorType) ? actorTypeRaw as OperationLogActorType : undefined,
    action: (query.action || '').toString().trim() || undefined,
    resourceType: (query.resourceType || '').toString().trim() || undefined,
    status: STATUSES.includes(statusRaw as OperationLogStatus) ? statusRaw as OperationLogStatus : undefined,
    startAt: parseDate(query.startAt),
    endAt: parseDate(query.endAt),
    limit: query.limit ? Number(query.limit) : undefined,
    offset: query.offset ? Number(query.offset) : undefined,
  })

  return { code: 0, msg: 'ok', data: logs }
})
