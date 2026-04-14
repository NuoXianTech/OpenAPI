import { and, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm'
import { createError } from 'h3'
import { apiCallStats, apiLists } from '@nuxthub/db/schema'

const MAX_CATEGORY_TAGS = 5
const MAX_CATEGORY_LENGTH = 100

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

function normalizeCategoryTags(category: string | null | undefined) {
  if (!category) {
    return null
  }

  const tags = Array.from(new Set(
    category
      .split(',')
      .map(tag => tag.trim())
      .filter(Boolean),
  ))

  if (tags.length > MAX_CATEGORY_TAGS) {
    throw createError({ statusCode: 400, message: `category tags cannot exceed ${MAX_CATEGORY_TAGS}` })
  }

  const normalized = tags.join(',')
  if (normalized.length > MAX_CATEGORY_LENGTH) {
    throw createError({ statusCode: 400, message: `category is too long, max length is ${MAX_CATEGORY_LENGTH}` })
  }

  return normalized || null
}

async function loadApiStats() {
  const rows = await db.select({
    apiListId: apiCallStats.apiListId,
    totalCalls: sql<number>`coalesce(sum(${apiCallStats.totalCount}), 0)`,
  }).from(apiCallStats).groupBy(apiCallStats.apiListId)

  const statsRows = rows as Array<{ apiListId: number, totalCalls: number | string | null }>

  return statsRows.reduce<Record<number, { totalCalls: number }>>((accumulator, row) => {
    accumulator[row.apiListId] = { totalCalls: Number(row.totalCalls) || 0 }
    return accumulator
  }, {})
}

function buildApiFilters(filters: Partial<{
  keyword: string
  status: number
  category: string
  isEnabled: boolean
  isStatistics: boolean
}>) {
  const conditions: SQL[] = []

  if (filters.keyword) {
    const keywordPattern = toContainsPattern(filters.keyword)
    const keywordCondition = or(
      ilike(apiLists.code, keywordPattern),
      ilike(apiLists.name, keywordPattern),
      ilike(apiLists.shortDesc, keywordPattern),
      ilike(apiLists.apiPath, keywordPattern),
      ilike(apiLists.category, keywordPattern),
    )
    if (keywordCondition) {
      conditions.push(keywordCondition)
    }
  }

  if (typeof filters.status === 'number') {
    conditions.push(eq(apiLists.status, filters.status))
  }

  if (filters.category) {
    conditions.push(ilike(apiLists.category, toContainsPattern(filters.category)))
  }

  if (typeof filters.isEnabled === 'boolean') {
    conditions.push(eq(apiLists.isEnabled, filters.isEnabled))
  }

  if (typeof filters.isStatistics === 'boolean') {
    conditions.push(eq(apiLists.isStatistics, filters.isStatistics))
  }

  return conditions
}

type PublicApiItem = {
  id: number
  name: string
  status: number
  category: string | null
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
  async list(filters: Partial<{ keyword: string, status: number, category: string, isEnabled: boolean, isStatistics: boolean }> = {}) {
    const conditions = buildApiFilters(filters)

    const query = db.select().from(apiLists)
    const [rows, statsMap] = await Promise.all([
      conditions.length
        ? await query.where(and(...conditions)).orderBy(desc(apiLists.updatedAt))
        : await query.orderBy(desc(apiLists.updatedAt)),
      loadApiStats(),
    ])

    return (rows as Array<typeof apiLists.$inferSelect>).map(row => ({
      ...row,
      totalCalls: statsMap[row.id]?.totalCalls ?? 0,
    }))
  },

  async listPublicApis(filters: Partial<{ keyword: string, status: number, category: string }> = {}) {
    const conditions = buildApiFilters(filters)
    const [rows, statsMap] = await Promise.all([
      conditions.length
        ? await db.select().from(apiLists).where(and(...conditions)).orderBy(desc(apiLists.updatedAt))
        : await db.select().from(apiLists).orderBy(desc(apiLists.updatedAt)),
      loadApiStats(),
    ])

    return (rows as Array<typeof apiLists.$inferSelect>).map((row): PublicApiItem => ({
      id: row.id,
      name: row.name,
      status: row.status,
      category: row.category,
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
      id: apiLists.id,
      apiPath: apiLists.apiPath,
      httpMethod: apiLists.httpMethod,
    }).from(apiLists).where(and(
      eq(apiLists.isEnabled, true),
      eq(apiLists.isStatistics, true),
    ))
  },

  async getById(id: number) {
    const res = await db.select().from(apiLists).where(eq(apiLists.id, id)).limit(1)
    return res[0] || null
  },

  async getByCode(code: string) {
    const res = await db.select().from(apiLists).where(eq(apiLists.code, code)).limit(1)
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
      category: normalizeCategoryTags(data.category),
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
    const { code: _code, ...patch } = data as Partial<typeof apiLists.$inferInsert> & { code?: string }
    const res = await db.update(apiLists)
      .set({
        ...patch,
        category: patch.category !== undefined ? normalizeCategoryTags(patch.category) : patch.category,
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
    const res = await db.update(apiLists).set(patch).where(eq(apiLists.id, id)).returning()
    return res[0] || null
  },
}
