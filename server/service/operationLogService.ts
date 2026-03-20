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
    return data
  },

  async list() {
    return []
  },
}
