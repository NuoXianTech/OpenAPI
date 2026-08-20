import { operationLogService, type OperationLogStatus } from '~~/server/services/operation-log-service'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { readPaginationQuery } from '~~/server/utils/pagination'
import { readQueryDate, readQueryOption, readQueryPositiveInteger, readQueryText } from '~~/server/utils/request-query'

const STATUSES: OperationLogStatus[] = ['success', 'failure']
const ACTOR_KINDS = ['admin', 'user'] as const

export default defineAdminEventHandler((event) => {
  const { query, limit, offset } = readPaginationQuery(event, { defaultLimit: 20 })

  const actorKind = readQueryOption(query.actorKind, ACTOR_KINDS)
  const status = readQueryOption(query.status, STATUSES)

  return operationLogService.list({
    keyword: readQueryText(query.keyword),
    userId: readQueryPositiveInteger(query.userId),
    actorKind,
    actor: readQueryText(query.actor),
    action: readQueryText(query.action),
    resourceType: readQueryText(query.resourceType),
    status,
    startAt: readQueryDate(query.startAt),
    endAt: readQueryDate(query.endAt),
    limit,
    offset
  })
})
