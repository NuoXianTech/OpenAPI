import { and, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm'
import { apiCallStats, apis } from '@nuxthub/db/schema'

function escapeLikePattern(value: string) {
  return value.replace(/[\\%_]/g, '\\$&')
}

function toContainsPattern(value: string) {
  return `%${escapeLikePattern(value)}%`
}

function normalizeMethodList(httpMethod: string) {
  return httpMethod
    .split(',')
    .map(method => method.trim())
    .filter(Boolean)
    .join(',')
}

async function loadApiStats() {
  const rows = await db.select({
    apiId: apiCallStats.apiId,
    totalCalls: sql<number>`coalesce(sum(${apiCallStats.totalCount}), 0)`,
  }).from(apiCallStats).groupBy(apiCallStats.apiId)

  const statsRows = rows as Array<{ apiId: number, totalCalls: number | string | null }>

  return statsRows.reduce<Record<number, { totalCalls: number }>>((accumulator, row) => {
    accumulator[row.apiId] = { totalCalls: Number(row.totalCalls) || 0 }
    return accumulator
  }, {})
}

export interface ApiListFilters {
  keyword?: string
  status?: number
  categoryId?: number
  isEnabled?: boolean
  isStatistics?: boolean
}

function buildApiFilters(filters: ApiListFilters) {
  const conditions: SQL[] = []

  if (filters.keyword) {
    const keywordPattern = toContainsPattern(filters.keyword)
    const keywordCondition = or(
      ilike(apis.code, keywordPattern),
      ilike(apis.name, keywordPattern),
      ilike(apis.shortDesc, keywordPattern),
      ilike(apis.apiPath, keywordPattern),
    )
    if (keywordCondition) {
      conditions.push(keywordCondition)
    }
  }

  if (typeof filters.status === 'number') {
    conditions.push(eq(apis.status, filters.status))
  }

  if (typeof filters.categoryId === 'number' && filters.categoryId > 0) {
    conditions.push(eq(apis.categoryId, filters.categoryId))
  }

  if (typeof filters.isEnabled === 'boolean') {
    conditions.push(eq(apis.isEnabled, filters.isEnabled))
  }

  if (typeof filters.isStatistics === 'boolean') {
    conditions.push(eq(apis.isStatistics, filters.isStatistics))
  }

  return conditions
}

type PublicApiItem = {
  id: number
  name: string
  status: number
  categoryId: number | null
  shortDesc: string
  description: string
  httpMethod: string
  apiPath: string
  docUrl: string
  isApiKey: boolean
  totalCalls: number
}

export type StatisticsTargetItem = {
  id: number
  apiPath: string
  httpMethod: string
}

export const apiService = {
  async list(filters: ApiListFilters = {}) {
    const conditions = buildApiFilters(filters)

    const query = db.select().from(apis)
    const [rows, statsMap] = await Promise.all([
      conditions.length
        ? await query.where(and(...conditions)).orderBy(desc(apis.updatedAt))
        : await query.orderBy(desc(apis.updatedAt)),
      loadApiStats(),
    ])

    return (rows as Array<typeof apis.$inferSelect>).map(row => ({
      ...row,
      totalCalls: statsMap[row.id]?.totalCalls ?? 0,
    }))
  },

  async listPublicApis(filters: ApiListFilters = {}) {
    const conditions = buildApiFilters(filters)
    const [rows, statsMap] = await Promise.all([
      conditions.length
        ? await db.select().from(apis).where(and(...conditions)).orderBy(desc(apis.updatedAt))
        : await db.select().from(apis).orderBy(desc(apis.updatedAt)),
      loadApiStats(),
    ])

    return (rows as Array<typeof apis.$inferSelect>).map((row): PublicApiItem => ({
      id: row.id,
      name: row.name,
      status: row.status,
      categoryId: row.categoryId,
      shortDesc: row.shortDesc,
      description: row.description,
      httpMethod: row.httpMethod,
      apiPath: row.apiPath,
      docUrl: row.docUrl,
      isApiKey: row.isApiKey,
      totalCalls: statsMap[row.id]?.totalCalls ?? 0,
    }))
  },

  async listStatisticsTargets() {
    return db.select({
      id: apis.id,
      apiPath: apis.apiPath,
      httpMethod: apis.httpMethod,
    }).from(apis).where(and(
      eq(apis.isEnabled, true),
      eq(apis.isStatistics, true),
    ))
  },

  async getById(id: number) {
    const res = await db.select().from(apis).where(eq(apis.id, id)).limit(1)
    return res[0] || null
  },

  async getByCode(code: string) {
    const res = await db.select().from(apis).where(eq(apis.code, code)).limit(1)
    return res[0] || null
  },

  async addApi(userid: number | null, data: Partial<typeof apis.$inferInsert> & {
    code: string
    name: string
    shortDesc: string
    description: string
    httpMethod: string
    apiPath: string
    docUrl: string
  }) {
    return await db.insert(apis).values({
      code: data.code,
      name: data.name,
      status: data.status ?? 1,
      categoryId: data.categoryId ?? null,
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

  async updateApi(id: number, userid: number | null, data: Partial<typeof apis.$inferInsert>) {
    const { code: _code, ...patch } = data as Partial<typeof apis.$inferInsert> & { code?: string }
    const res = await db.update(apis)
      .set({
        ...patch,
        httpMethod: patch.httpMethod ? normalizeMethodList(patch.httpMethod) : patch.httpMethod,
        updatedBy: userid,
        updatedAt: new Date(),
      })
      .where(eq(apis.id, id))
      .returning()
    return res[0] || null
  },

  async deleteApi(id: number) {
    const res = await db.delete(apis).where(eq(apis.id, id)).returning()
    return res[0] || null
  },

  async toggleApiField(id: number, field: 'isEnabled' | 'isStatistics', value: boolean, updatedBy?: number) {
    const patch: {
      updatedAt: Date
      updatedBy?: number
      isEnabled?: boolean
      isStatistics?: boolean
    } = {
      updatedAt: new Date(),
      [field]: value,
    }
    if (typeof updatedBy !== 'undefined') {
      patch.updatedBy = updatedBy
    }
    const res = await db.update(apis).set(patch).where(eq(apis.id, id)).returning()
    return res[0] || null
  },
}
