import { and, desc, eq, ilike, or } from 'drizzle-orm'
import { apiCallStats, apiLists } from '@nuxthub/db/schema'

function normalizeMethodList(httpMethod: string) {
  return httpMethod
    .split(',')
    .map(method => method.trim())
    .filter(Boolean)
    .join(',')
}

async function loadApiStats() {
  const rows = await db.select().from(apiCallStats)
  return rows.reduce<Record<number, { totalCalls: number }>>((accumulator, row) => {
    const current = accumulator[row.apiId] || { totalCalls: 0 }
    current.totalCalls += row.totalCount
    accumulator[row.apiId] = current
    return accumulator
  }, {})
}

export const apiService = {
  async list(filters: Partial<{ keyword: string, status: number, isEnabled: boolean, isStatistics: boolean }> = {}) {
    const conditions = [] as any[]
    if (filters.keyword) {
      conditions.push(or(
        ilike(apiLists.apiId, `%${filters.keyword}%`),
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
    const [rows, statsMap] = await Promise.all([
      conditions.length
        ? await query.where(and(...conditions)).orderBy(desc(apiLists.updatedAt))
        : await query.orderBy(desc(apiLists.updatedAt)),
      loadApiStats(),
    ])

    return rows.map(row => ({
      ...row,
      totalCalls: statsMap[row.id]?.totalCalls ?? 0,
    }))
  },

  async getApi() {
    const [rows, statsMap] = await Promise.all([
      db.select().from(apiLists),
      loadApiStats(),
    ])

    return rows.map(row => ({
      ...row,
      api_id: row.apiId,
      apiId: row.apiId,
      http_method: row.httpMethod,
      api_path: row.apiPath,
      doc_url: row.docUrl,
      is_enabled: row.isEnabled,
      is_api_key: row.isApiKey,
      is_statistics: row.isStatistics,
      total_calls: statsMap[row.id]?.totalCalls ?? 0,
      totalCalls: statsMap[row.id]?.totalCalls ?? 0,
    }))
  },

  async getById(id: number) {
    const res = await db.select().from(apiLists).where(eq(apiLists.id, id)).limit(1)
    return res[0] || null
  },

  async getByApiId(apiId: string) {
    const res = await db.select().from(apiLists).where(eq(apiLists.apiId, apiId)).limit(1)
    return res[0] || null
  },

  async addApi(userid: number | null, data: Partial<typeof apiLists.$inferInsert> & {
    apiId: string
    name: string
    shortDesc: string
    description: string
    httpMethod: string
    apiPath: string
    docUrl: string
  }) {
    return await db.insert(apiLists).values({
      apiId: data.apiId,
      name: data.name,
      status: data.status ?? 1,
      category: data.category ?? null,
      shortDesc: data.shortDesc,
      description: data.description,
      httpMethod: normalizeMethodList(data.httpMethod),
      apiPath: data.apiPath,
      docUrl: data.docUrl,
      isEnabled: data.isEnabled ?? true,
      isApiKey: data.isApiKey ?? false,
      isStatistics: data.isStatistics ?? true,
      rateLimitPerMinute: data.rateLimitPerMinute ?? 0,
      createdBy: userid,
      updatedBy: userid,
    }).returning()
  },

  async updateApi(id: number, userid: number | null, data: Partial<typeof apiLists.$inferInsert>) {
    const { apiId: _apiId, ...patch } = data as Partial<typeof apiLists.$inferInsert> & { apiId?: string }
    const res = await db.update(apiLists)
      .set({
        ...patch,
        httpMethod: patch.httpMethod ? normalizeMethodList(patch.httpMethod) : patch.httpMethod,
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
