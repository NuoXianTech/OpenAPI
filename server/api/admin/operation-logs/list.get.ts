import type { H3Event } from 'h3'
import { getQuery } from 'h3'
import { operationLogService, type OperationLogStatus } from '~~/server/service/operationLogService'
import { requireAdmin } from '~~/server/utils/auth'

const STATUSES: OperationLogStatus[] = ['success', 'failure']
const ACTOR_KINDS = ['admin', 'user'] as const
type ActorKind = typeof ACTOR_KINDS[number]

function parseDate(value: unknown): Date | undefined {
  if (!value) return undefined
  const date = new Date(String(value))
  return Number.isNaN(date.getTime()) ? undefined : date
}

export default defineEventHandler(async (event: H3Event) => {
  await requireAdmin(event)
  const query = getQuery(event)

  const actorKindRaw = (query.actorKind || '').toString()
  const statusRaw = (query.status || '').toString()

  return operationLogService.list({
    userId: query.userId ? Number(query.userId) : undefined,
    actorKind: ACTOR_KINDS.includes(actorKindRaw as ActorKind) ? actorKindRaw as ActorKind : undefined,
    actor: (query.actor || '').toString().trim() || undefined,
    action: (query.action || '').toString().trim() || undefined,
    resourceType: (query.resourceType || '').toString().trim() || undefined,
    status: STATUSES.includes(statusRaw as OperationLogStatus) ? statusRaw as OperationLogStatus : undefined,
    startAt: parseDate(query.startAt),
    endAt: parseDate(query.endAt),
    limit: query.limit ? Number(query.limit) : undefined,
    offset: query.offset ? Number(query.offset) : undefined
  })
})
