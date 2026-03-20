import { and, asc, desc, eq, ilike, or } from 'drizzle-orm'
import { apiLists } from '@nuxthub/db/schema'

export const apiService = {
  async list(filters: Partial<{ keyword: string; status: number; isEnabled: boolean; isStatistics: boolean }> = {}) {
    const conditions = [] as any[]
    if (filters.keyword) {
      conditions.push(or(
        ilike(apiLists.code, `%${filters.keyword}%`),
        ilike(apiLists.name, `%${filters.keyword}%`),
        ilike(apiLists.shortDesc, `%${filters.keyword}%`),
        ilike(apiLists.apiPath, `%${filters.keyword}%`),
      ))
    }
    if (typeof filters.status === 'number') {
      conditions.push(eq(apiLists.status, filters.status))
    }
    if (typeof filters.isEnabled === 'boolean') {
      conditions.push(eq(apiLists.isEnabled, filters.isEnabled))
    }
    if (typeof filters.isStatistics === 'boolean') {
      conditions.push(eq(apiLists.isStatistics, filters.isStatistics))
    }

    const query = db.select().from(apiLists)
    const rows = conditions.length
      ? await query.where(and(...conditions)).orderBy(desc(apiLists.updatedAt))
      : await query.orderBy(desc(apiLists.updatedAt))
    return rows
  },

  async getApi() {
    return await db.select({
      name: apiLists.name,
      status: apiLists.status,
      short_desc: apiLists.shortDesc,
      description: apiLists.description,
      http_method: apiLists.httpMethod,
      api_path: apiLists.apiPath,
      doc_url: apiLists.docUrl,
      is_enabled: apiLists.isEnabled,
      is_api_key: apiLists.isApiKey,
      is_statistics: apiLists.isStatistics,
    }).from(apiLists)
  },

  async getById(id: number) {
    const res = await db.select().from(apiLists).where(eq(apiLists.id, id)).limit(1)
    return res[0] || null
  },

  async addApi(userid: number | null, data: Partial<typeof apiLists.$inferInsert> & {
    code: string
    name: string
    shortDesc: string
    description: string
    httpMethod: string
    apiPath: string
    docUrl: string
  }) {
    return await db.insert(apiLists).values({
      code: data.code,
      name: data.name,
      status: data.status ?? 1,
      category: data.category ?? null,
      shortDesc: data.shortDesc,
      description: data.description,
      version: data.version ?? 'v1',
      tags: data.tags ?? null,
      authType: data.authType ?? 'none',
      requestSchema: data.requestSchema ?? null,
      responseSchema: data.responseSchema ?? null,
      requestExample: data.requestExample ?? null,
      responseExample: data.responseExample ?? null,
      httpMethod: data.httpMethod,
      apiPath: data.apiPath,
      docUrl: data.docUrl,
      isEnabled: data.isEnabled ?? true,
      isApiKey: data.isApiKey ?? false,
      isStatistics: data.isStatistics ?? true,
      rateLimitPerMinute: data.rateLimitPerMinute ?? 0,
      totalCalls: data.totalCalls ?? 0,
      successCalls: data.successCalls ?? 0,
      failureCalls: data.failureCalls ?? 0,
      createdBy: userid,
      updatedBy: userid,
    }).returning()
  },

  async updateApi(id: number, userid: number | null, data: Partial<typeof apiLists.$inferInsert>) {
    const res = await db.update(apiLists)
      .set({
        ...data,
        updatedBy: userid,
        updatedAt: new Date(),
      })
      .where(eq(apiLists.id, id))
      .returning()
    return res[0] || null
  },

  async deleteApi(id: number) {
    const res = await db.delete(apiLists).where(eq(apiLists.id, id)).returning()
    return res[0] || null
  },

  async toggleApiField(id: number, field: 'isEnabled' | 'isStatistics', value: boolean, updatedBy?: number) {
    const patch: Record<string, any> = { [field]: value, updatedAt: new Date() }
    if (updatedBy) {
      patch.updatedBy = updatedBy
    }
    const res = await db.update(apiLists).set(patch).where(eq(apiLists.id, id)).returning()
    return res[0] || null
  },
}
