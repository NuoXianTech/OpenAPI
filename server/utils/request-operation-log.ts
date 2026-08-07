import type { H3Event } from 'h3'
import { operationLogService, type OperationLogInput } from '~~/server/services/operation-log-service'
import { readRequestMeta } from '~~/server/utils/request-meta'

/** HTTP adapter that enriches an application audit entry with request metadata. */
export async function addRequestOperationLog(event: H3Event, input: OperationLogInput): Promise<void> {
  const requestMeta = readRequestMeta(event)
  await operationLogService.addLog({
    ...input,
    ip: input.ip ?? requestMeta.ip,
    userAgent: input.userAgent ?? requestMeta.userAgent
  })
}
