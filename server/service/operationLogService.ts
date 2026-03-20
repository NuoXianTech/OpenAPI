import { operationLogs } from '@nuxthub/db/schema'

export const operationLogService = {
  async addLog(data: {
    userId?: number | null
    actor?: string | null
    action: string
    resourceType?: string | null
    resourceId?: string | null
    ip?: string | null
    userAgent?: string | null
    detail?: string | null
  }) {
    return db.insert(operationLogs).values({
      userId: data.userId ?? null,
      actor: data.actor ?? null,
      action: data.action,
      resourceType: data.resourceType ?? null,
      resourceId: data.resourceId ?? null,
      ip: data.ip ?? null,
      userAgent: data.userAgent ?? null,
      detail: data.detail ?? null,
    }).returning()
  },

  async list() {
    return db.select().from(operationLogs)
  },
}
