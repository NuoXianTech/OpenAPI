import { createHash } from 'node:crypto'
import { and, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm'
import { apiCallStats, apis } from '~~/server/db/schema'
import { hasAnyChargedMethod } from '~~/server/config/api-guard'
import { API_STATUS, isAutomaticApiStatus } from '#shared/config/api-status'
import type { ApiCatalogItem } from '#shared/types/api'
import { resolveApiAutoStatuses } from '~~/server/services/api-status-service'
import type { ApiGuardConfig } from '~~/server/types/api-guard'
import {
  deleteSharedCache,
  getSharedCache,
  getSharedCacheVersion,
  incrementSharedCacheVersion
} from '~~/server/utils/shared-cache'
import { toNumber } from '~~/server/utils/number'
import { firstRow } from '~~/server/utils/row'

function escapeLikePattern(value: string) {
  return value.replace(/[\\%_]/g, '\\$&')
}

const PUBLIC_API_LIST_TTL_SECONDS = 15
const API_GUARD_TTL_SECONDS = 15
const PUBLIC_API_LIST_VERSION = 'public-apis'
const PUBLIC_STATS_VERSION = 'public-stats'

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
    totalCalls: sql<number>`coalesce(sum(${apiCallStats.totalCount}), 0)`
  }).from(apiCallStats).groupBy(apiCallStats.apiId)

  const statsRows = rows as Array<{ apiId: number, totalCalls: number | string | null }>

  return statsRows.reduce<Record<number, { totalCalls: number }>>((accumulator, row) => {
    accumulator[row.apiId] = { totalCalls: toNumber(row.totalCalls) }
    return accumulator
  }, {})
}

interface ApiListFilters {
  keyword?: string
  status?: number
  categoryId?: number
  isEnabled?: boolean
  isStatistics?: boolean
  isOrphaned?: boolean
}

function buildApiFilters(filters: ApiListFilters) {
  const conditions: SQL[] = []

  if (filters.keyword) {
    const keywordPattern = toContainsPattern(filters.keyword)
    const keywordCondition = or(
      ilike(apis.code, keywordPattern),
      ilike(apis.name, keywordPattern),
      ilike(apis.shortDesc, keywordPattern),
      ilike(apis.apiPath, keywordPattern)
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

  if (typeof filters.isOrphaned === 'boolean') {
    conditions.push(eq(apis.isOrphaned, filters.isOrphaned))
  }

  return conditions
}

function createGuardCacheKey(pathVersion: string, code: string): string {
  return `cache:guard:${pathVersion}:${code}`
}

function createPublicApiListCacheKey(filters: ApiListFilters, version: number): string {
  const digest = createHash('sha256').update(JSON.stringify(filters)).digest('hex')
  return `cache:public:apis:v${version}:${digest}`
}

async function invalidateApiCaches(api: Pick<ApiGuardConfig, 'pathVersion' | 'code'>): Promise<void> {
  await Promise.all([
    deleteSharedCache([createGuardCacheKey(api.pathVersion, api.code)]),
    incrementSharedCacheVersion(PUBLIC_API_LIST_VERSION),
    incrementSharedCacheVersion(PUBLIC_STATS_VERSION)
  ])
}

function resolvePublicApiStatus(row: typeof apis.$inferSelect, autoStatusMap: Record<number, number>) {
  if (!isAutomaticApiStatus(row.status)) return row.status
  return autoStatusMap[row.id] ?? API_STATUS.unknown
}

async function findApiById(id: number) {
  const rows = await db.select().from(apis)
    .where(eq(apis.id, id))
    .limit(1)
  return firstRow(rows)
}

export const apiService = {
  async listPublicApis(filters: ApiListFilters = {}) {
    const normalizedFilters: ApiListFilters = {
      keyword: filters.keyword?.trim() || undefined,
      status: filters.status,
      categoryId: filters.categoryId,
      isEnabled: filters.isEnabled,
      isStatistics: filters.isStatistics,
      isOrphaned: filters.isOrphaned
    }
    const version = await getSharedCacheVersion(PUBLIC_API_LIST_VERSION)

    return getSharedCache<ApiCatalogItem[]>({
      key: createPublicApiListCacheKey(normalizedFilters, version),
      ttlSeconds: PUBLIC_API_LIST_TTL_SECONDS,
      async loader() {
        const requestedStatus = normalizedFilters.status
        const conditions = buildApiFilters({ ...normalizedFilters, status: undefined })
        const where = conditions.length ? and(...conditions) : undefined
        const [rows, statsMap] = await Promise.all([
          (where
            ? db.select().from(apis).where(where)
            : db.select().from(apis)
          ).orderBy(desc(apis.updatedAt)),
          loadApiStats()
        ])
        const apiRows = rows as Array<typeof apis.$inferSelect>
        const autoStatusMap = await resolveApiAutoStatuses(
          apiRows
            .filter(row => isAutomaticApiStatus(row.status))
            .map(row => row.id)
        )

        return apiRows
          .map((row): ApiCatalogItem => ({
            id: row.id,
            name: row.name,
            status: resolvePublicApiStatus(row, autoStatusMap),
            categoryId: row.categoryId,
            shortDesc: row.shortDesc,
            description: row.description,
            httpMethod: row.httpMethod,
            apiPath: row.apiPath,
            docUrl: row.docUrl,
            isApiKey: row.isApiKey,
            methodCosts: row.methodCosts ?? {},
            totalCalls: statsMap[row.id]?.totalCalls ?? 0
          }))
          .filter(row => typeof requestedStatus !== 'number' || row.status === requestedStatus)
      }
    })
  },

  /**
   * Gate 专用：仅投影治理所需字段，避免把无关数据库字段写入共享缓存。
   */
  async loadGuardConfig(pathVersion: string, code: string): Promise<ApiGuardConfig | null> {
    return getSharedCache<ApiGuardConfig | null>({
      key: createGuardCacheKey(pathVersion, code),
      ttlSeconds: API_GUARD_TTL_SECONDS,
      async loader() {
        const rows = await db.select({
          id: apis.id,
          code: apis.code,
          pathVersion: apis.pathVersion,
          apiPath: apis.apiPath,
          httpMethod: apis.httpMethod,
          isEnabled: apis.isEnabled,
          isApiKey: apis.isApiKey,
          isStatistics: apis.isStatistics,
          isOrphaned: apis.isOrphaned,
          rateLimitPerSecond: apis.rateLimitPerSecond,
          rateLimitPerMinute: apis.rateLimitPerMinute,
          rateLimitPerHour: apis.rateLimitPerHour,
          rateLimitPerDay: apis.rateLimitPerDay,
          methodCosts: apis.methodCosts,
          dailyQuota: apis.dailyQuota,
          timeoutMs: apis.timeoutMs
        }).from(apis)
          .where(and(eq(apis.pathVersion, pathVersion), eq(apis.code, code)))
          .limit(1)
        return firstRow(rows)
      }
    })
  },

  /** 按版本列出已登记 APIs，admin 页面分 tab 使用 */
  async listByVersion(pathVersion: string) {
    return db.select().from(apis)
      .where(eq(apis.pathVersion, pathVersion))
      .orderBy(desc(apis.updatedAt))
  },

  /**
   * 仅治理字段可编辑：code/pathVersion/apiPath/httpMethod/endpointCount 由 manifest 注入，
   * 不接受外部 patch。orphan 接口（文件夹已被物理删除）不可重新启用，但允许改分类等元数据。
   *
   * 计费一致性：合并请求 patch 与现有记录后，若 methodCosts 中存在 > 0 的方法但 isApiKey=false，
   * 视为非法配置，抛错（兜底 admin 接口的不完整 patch）。
   */
  async updateApi(id: number, userid: number | null, data: Partial<typeof apis.$inferInsert>) {
    const {
      code: _code,
      pathVersion: _pv,
      apiPath: _ap,
      httpMethod: _hm,
      endpointCount: _ec,
      isOrphaned: _io,
      ...patch
    } = data as Partial<typeof apis.$inferInsert>

    const existing = await findApiById(id)
    if (!existing) return null

    // Orphan 守护：文件夹物理删除后，禁止再启用接口或开统计
    if (existing.isOrphaned) {
      if (patch.isEnabled === true) {
        throw new Error('该接口对应的源文件已被物理删除，无法启用；如需启用请恢复 server/routes 中的同名文件夹')
      }
      if (patch.isStatistics === true) {
        throw new Error('该接口对应的源文件已被物理删除，无法开启统计；如需统计请恢复 server/routes 中的同名文件夹')
      }
    }

    if (patch.isEnabled === false) {
      patch.isStatistics = false
    } else if (patch.isStatistics === true) {
      const effectiveIsEnabled = patch.isEnabled ?? existing.isEnabled
      if (!effectiveIsEnabled) {
        throw new Error('启用统计前必须先启用接口')
      }
    }

    // 合并后的 effective methodCosts / isApiKey 校验
    if (patch.methodCosts !== undefined || patch.isApiKey !== undefined) {
      const effectiveCosts = patch.methodCosts !== undefined
        ? (patch.methodCosts as Record<string, number>)
        : existing.methodCosts
      const effectiveIsApiKey = patch.isApiKey !== undefined ? patch.isApiKey : existing.isApiKey
      if (hasAnyChargedMethod(effectiveCosts) && !effectiveIsApiKey) {
        throw new Error('设置扣费金额时必须开启「必需 API Key」')
      }
    }

    const res = await db.update(apis)
      .set({
        ...patch,
        updatedBy: userid,
        updatedAt: new Date()
      })
      .where(eq(apis.id, id))
      .returning()
    const updated = firstRow(res)
    if (updated) await invalidateApiCaches(updated)
    return updated
  },

  /**
   * 物理删除接口行。
   *
   * 仅当不存在任何关联 apiCalls 时才能成功（apiCalls.apiId FK 为 restrict）。
   * 这是为了保证调用日志/统计/积分流水中的 apiId 快照仍能 join 到 apis 表。
   * 若 admin 希望"隐藏"orphan 接口，应通过 isEnabled=false + isStatistics=false 实现，
   * 不要试图删除有历史的接口行。
   */
  async deleteApi(id: number) {
    try {
      const res = await db.delete(apis)
        .where(eq(apis.id, id))
        .returning()
      const deleted = firstRow(res)
      if (deleted) await invalidateApiCaches(deleted)
      return deleted
    } catch (err) {
      // FK restrict 触发：apiCalls 中仍有该接口的历史调用
      throw new Error('该接口存在历史调用日志，无法删除；请先在统计页面清理调用日志，或保留接口为禁用状态', { cause: err })
    }
  },

  async toggleApiField(id: number, field: 'isEnabled' | 'isStatistics', value: boolean, updatedBy?: number | null) {
    // orphan 接口禁止开启 isEnabled / isStatistics；统计只能在接口启用后开启。
    if (value === true) {
      const existing = await findApiById(id)
      if (!existing) return null
      if (existing?.isOrphaned) {
        throw new Error('该接口对应的源文件已被物理删除，无法启用相关功能；如需恢复请补回 server/routes 中的同名文件夹')
      }
      if (field === 'isStatistics' && !existing.isEnabled) {
        throw new Error('启用统计前必须先启用接口')
      }
    }

    const patch: {
      updatedAt: Date
      updatedBy?: number | null
      isEnabled?: boolean
      isStatistics?: boolean
    } = {
      updatedAt: new Date(),
      [field]: value
    }
    if (field === 'isEnabled' && value === false) {
      patch.isStatistics = false
    }
    // null 表示系统任务或无操作者快照；正整数为 users.id 快照。
    patch.updatedBy = typeof updatedBy === 'number' && updatedBy > 0 ? updatedBy : null
    const res = await db.update(apis).set(patch).where(eq(apis.id, id)).returning()
    const updated = firstRow(res)
    if (updated) await invalidateApiCaches(updated)
    return updated
  },

  /**
   * 一键登记：按 (pathVersion, code) 幂等入库。
   * 已存在则刷新 manifest 投影（apiPath/httpMethod/endpointCount），治理字段保留。
   * 当 orphan 接口被重新注册时（文件夹回归），自动清除 isOrphaned 标志；
   * isEnabled/isStatistics 仍保持原值（admin 需要主动启用，避免静默上线）。
   */
  async registerFromManifest(data: {
    pathVersion: string
    code: string
    apiPath: string
    httpMethod: string
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
      methodCosts: Record<string, number>
      timeoutMs: number
    }
  }) {
    if (data.defaults.isStatistics && !data.defaults.isEnabled) {
      throw new Error('启用统计前必须先启用接口')
    }

    const existing = await this.loadGuardConfig(data.pathVersion, data.code)
    if (existing) {
      const incomingMethods = normalizeMethodList(data.httpMethod)
      const methodChanged = existing.httpMethod !== incomingMethods
      const wasOrphan = existing.isOrphaned

      const patch: Partial<typeof apis.$inferInsert> = {
        apiPath: data.apiPath,
        httpMethod: incomingMethods,
        endpointCount: data.endpointCount,
        isOrphaned: false,
        updatedBy: data.createdBy,
        updatedAt: new Date()
      }

      // 从 orphan 状态回归且方法集变化（新增/减少了 xxx.<method>.ts）：保持禁用，
      // 让 admin 主动复核——避免悄无声息地把"看似同名但行为已变"的接口重新上线
      if (wasOrphan && methodChanged) {
        patch.isEnabled = false
        patch.isStatistics = false
      }

      const res = await db.update(apis)
        .set(patch)
        .where(eq(apis.id, existing.id))
        .returning()
      const updated = firstRow(res)
      if (updated) await invalidateApiCaches(updated)

      if (methodChanged) {
        console.warn(
          `[api-manifest] httpMethod changed for ${data.pathVersion}/${data.code}: `
          + `"${existing.httpMethod}" → "${incomingMethods}"${wasOrphan ? ' (orphan recovered, kept disabled for admin review)' : ''}`
        )
      }

      return updated
    }

    const res = await db.insert(apis).values({
      code: data.code,
      pathVersion: data.pathVersion,
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
      methodCosts: data.defaults.methodCosts,
      timeoutMs: data.defaults.timeoutMs,
      createdBy: data.createdBy,
      updatedBy: data.createdBy
    }).returning()
    const inserted = firstRow(res)
    if (inserted) await invalidateApiCaches(inserted)
    return inserted
  },

  /**
   * Orphan 标记：manifest 中已无对应文件夹时，把行强制设为 orphan 状态。
   * 强制关闭 isEnabled + isStatistics，后续 admin 可改分类但不能再启用。
   */
  async markOrphaned(id: number) {
    const res = await db.update(apis)
      .set({
        isOrphaned: true,
        isEnabled: false,
        isStatistics: false,
        updatedAt: new Date()
      })
      .where(eq(apis.id, id))
      .returning()
    const updated = firstRow(res)
    if (updated) await invalidateApiCaches(updated)
    return updated
  }
}
