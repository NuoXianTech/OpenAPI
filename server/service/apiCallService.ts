import { eq } from 'drizzle-orm'
import { apiCalls } from '@nuxthub/db/schema'

export const apiCallService = {
  async list() {
    return db.select().from(apiCalls)
  },

  async listByApi(apiId: number) {
    return db.select().from(apiCalls).where(eq(apiCalls.apiId, apiId))
  },

  async addCall(data: {
    apiId: number
    apiKeyId?: number | null
    userId?: number | null
    path: string
    method: string
    statusCode: number
    latencyMs: number
    ip?: string | null
    requestSize?: number | null
    responseSize?: number | null
    rawRequest?: string | null
  }) {
    return db.insert(apiCalls).values({
      apiId: data.apiId,
      apiKeyId: data.apiKeyId ?? null,
      userId: data.userId ?? null,
      path: data.path,
      method: data.method,
      statusCode: data.statusCode,
      latencyMs: data.latencyMs,
      ip: data.ip ?? null,
      requestSize: data.requestSize ?? null,
      responseSize: data.responseSize ?? null,
      rawRequest: data.rawRequest ?? null,
    }).returning()
  },
}
