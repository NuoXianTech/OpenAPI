import { and, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm'
import { apiCallStats, apis } from '@nuxthub/db/schema'
import { API_META_CACHE_TTL_MS } from '~~/shared/config/apiGuard'

function escapeLikePattern(value: string) {
  return value.replace(/[\\%_]/g, '\\$&')
}

// Guard 配置 LRU 缓存：热路径上反复命中同一条 apis 记录，用短 TTL 缓存避免查库
type GuardCacheEntry = { value: typeof apis.$inferSelect | null, expiresAt: number }
const guardConfigCache = new Map<string, GuardCacheEntry>()

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
  costCredits: number
  totalCalls: number
}

export type StatisticsTargetItem = {
  id: number
  apiPath: string
  httpMethod: string
}

export const apiService = {
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
      costCredits: row.costCredits,
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

  /**
   * Gate 专用：按 (pathVersion, code) 读取完整治理配置。
   * 命中 LRU 缓存（TTL 15s）避免热路径反复查库。
   */
  async loadGuardConfig(pathVersion: string, code: string) {
    const cacheKey = `${pathVersion}:${code}`
    const now = Date.now()
    const cached = guardConfigCache.get(cacheKey)
    if (cached && cached.expiresAt > now) return cached.value

    const rows = await db.select().from(apis)
      .where(and(eq(apis.pathVersion, pathVersion), eq(apis.code, code)))
      .limit(1)
    const value = rows[0] || null
    guardConfigCache.set(cacheKey, { value, expiresAt: now + API_META_CACHE_TTL_MS })
    return value
  },

  /** 使某 code 的 guard 缓存失效（admin 修改后调用） */
  invalidateGuardConfig(pathVersion: string, code: string) {
    guardConfigCache.delete(`${pathVersion}:${code}`)
  },

  /** 按版本列出已登记 APIs，admin 页面分 tab 使用 */
  async listByVersion(pathVersion: string) {
    return db.select().from(apis)
      .where(eq(apis.pathVersion, pathVersion))
      .orderBy(desc(apis.updatedAt))
  },

  /**
   * 仅治理字段可编辑：code/pathVersion/apiPath/httpMethod/sourceDir/endpointCount 由 manifest 注入，
   * 不接受外部 patch。
   *
   * 计费一致性：合并请求 patch 与现有记录后，若 costCredits>0 但 isApiKey=false，
   * 视为非法配置，抛错（兜底 admin 接口的不完整 patch）。
   */
  async updateApi(id: number, userid: number | null, data: Partial<typeof apis.$inferInsert>) {
    const {
      code: _code,
      pathVersion: _pv,
      apiPath: _ap,
      httpMethod: _hm,
      sourceDir: _sd,
      endpointCount: _ec,
      ...patch
    } = data as Partial<typeof apis.$inferInsert>

    // 合并后的 effective costCredits / isApiKey 校验
    if (patch.costCredits !== undefined || patch.isApiKey !== undefined) {
      const existing = await this.getById(id)
      if (existing) {
        const effectiveCost = patch.costCredits !== undefined ? Number(patch.costCredits) : existing.costCredits
        const effectiveIsApiKey = patch.isApiKey !== undefined ? patch.isApiKey : existing.isApiKey
        if (effectiveCost > 0 && !effectiveIsApiKey) {
          throw new Error('设置扣费金额时必须开启「必需 API Key」')
        }
      }
    }

    const res = await db.update(apis)
      .set({
        ...patch,
        updatedBy: userid,
        updatedAt: new Date(),
      })
      .where(eq(apis.id, id))
      .returning()
    const updated = res[0] || null
    if (updated) guardConfigCache.delete(`${updated.pathVersion}:${updated.code}`)
    return updated
  },

  async deleteApi(id: number) {
    const res = await db.delete(apis).where(eq(apis.id, id)).returning()
    const deleted = res[0] || null
    if (deleted) guardConfigCache.delete(`${deleted.pathVersion}:${deleted.code}`)
    return deleted
  },

  async toggleApiField(id: number, field: 'isEnabled' | 'isStatistics', value: boolean, updatedBy?: number | null) {
    const patch: {
      updatedAt: Date
      updatedBy?: number | null
      isEnabled?: boolean
      isStatistics?: boolean
    } = {
      updatedAt: new Date(),
      [field]: value,
    }
    // 0 是 admin 伪用户的占位，users 表无此 id；此处归一为 null 避免触发外键约束
    patch.updatedBy = typeof updatedBy === 'number' && updatedBy > 0 ? updatedBy : null
    const res = await db.update(apis).set(patch).where(eq(apis.id, id)).returning()
    const updated = res[0] || null
    if (updated) guardConfigCache.delete(`${updated.pathVersion}:${updated.code}`)
    return updated
  },

  /**
   * 一键登记：按 (pathVersion, code) 幂等入库。
   * 已存在则刷新 manifest 投影（apiPath/httpMethod/sourceDir/endpointCount），治理字段保留。
   */
  async registerFromManifest(data: {
    pathVersion: string
    code: string
    apiPath: string
    httpMethod: string
    sourceDir: string
    endpointCount: number
    createdBy: number | null
    defaults: {
      name: string
      shortDesc: string
      description: string
      docUrl: string
      status: number
      categoryId: number | null
      isEnabled: boolean
      isApiKey: boolean
      isStatistics: boolean
      rateLimitPerSecond: number
      rateLimitPerMinute: number
      rateLimitPerHour: number
      rateLimitPerDay: number
      dailyQuota: number
      costCredits: number
      timeoutMs: number
    }
  }) {
    const existing = await this.loadGuardConfig(data.pathVersion, data.code)
    if (existing) {
      const res = await db.update(apis)
        .set({
          apiPath: data.apiPath,
          httpMethod: normalizeMethodList(data.httpMethod),
          sourceDir: data.sourceDir,
          endpointCount: data.endpointCount,
          updatedBy: data.createdBy,
          updatedAt: new Date(),
        })
        .where(eq(apis.id, existing.id))
        .returning()
      const updated = res[0] || null
      if (updated) guardConfigCache.delete(`${updated.pathVersion}:${updated.code}`)
      return updated
    }

    const res = await db.insert(apis).values({
      code: data.code,
      pathVersion: data.pathVersion,
      sourceDir: data.sourceDir,
      endpointCount: data.endpointCount,
      name: data.defaults.name,
      status: data.defaults.status,
      categoryId: data.defaults.categoryId,
      shortDesc: data.defaults.shortDesc,
      description: data.defaults.description,
      httpMethod: normalizeMethodList(data.httpMethod),
      apiPath: data.apiPath,
      docUrl: data.defaults.docUrl,
      isEnabled: data.defaults.isEnabled,
      isApiKey: data.defaults.isApiKey,
      isStatistics: data.defaults.isStatistics,
      rateLimitPerSecond: data.defaults.rateLimitPerSecond,
      rateLimitPerMinute: data.defaults.rateLimitPerMinute,
      rateLimitPerHour: data.defaults.rateLimitPerHour,
      rateLimitPerDay: data.defaults.rateLimitPerDay,
      dailyQuota: data.defaults.dailyQuota,
      costCredits: data.defaults.costCredits,
      timeoutMs: data.defaults.timeoutMs,
      createdBy: data.createdBy,
      updatedBy: data.createdBy,
    }).returning()
    return res[0] || null
  },
}
