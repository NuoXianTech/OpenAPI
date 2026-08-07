import { and, desc, eq } from 'drizzle-orm'
import { apis } from '~~/server/db/schema'
import { createApplicationError } from '~~/server/errors/application-error'
import { hasAnyChargedMethod } from '~~/server/config/api-guard'
import { invalidatePublicApiCatalogCache } from './api-catalog-service'
import type { ApiGuardConfig } from '~~/server/types/api-guard'
import {
  deleteSharedCache,
  getSharedCache,
  incrementSharedCacheVersion
} from '~~/server/utils/shared-cache'
import { firstRow } from '~~/server/utils/row'
import { getSqlState } from '~~/server/utils/database-error'

const API_GUARD_TTL_SECONDS = 15
const PUBLIC_STATS_VERSION = 'public-stats'

function normalizeMethodList(httpMethod: string) {
  return httpMethod
    .split(',')
    .map(method => method.trim())
    .filter(Boolean)
    .join(',')
}

function createGuardCacheKey(pathVersion: string, code: string): string {
  return `cache:guard:${pathVersion}:${code}`
}

interface ApiManifestRegistration {
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
}

interface ApiGovernanceState {
  isEnabled: boolean
  isApiKey: boolean
  isStatistics: boolean
  isOrphaned: boolean
  methodCosts: Record<string, number>
}

function assertApiGovernanceState(state: ApiGovernanceState): void {
  if (state.isOrphaned && (state.isEnabled || state.isStatistics)) {
    throw createApplicationError({
      statusCode: 400,
      message: '该接口对应的源文件已被物理删除，无法启用相关功能；如需恢复请补回 server/routes 中的同名文件夹'
    })
  }
  if (state.isStatistics && !state.isEnabled) {
    throw createApplicationError({ statusCode: 400, message: '启用统计前必须先启用接口' })
  }
  if (state.isEnabled && hasAnyChargedMethod(state.methodCosts) && (!state.isApiKey || !state.isStatistics)) {
    throw createApplicationError({
      statusCode: 400,
      message: '启用付费接口时必须同时开启「API密钥」和「统计」'
    })
  }
}

async function invalidateApiCaches(api: Pick<ApiGuardConfig, 'pathVersion' | 'code'>): Promise<void> {
  await Promise.all([
    deleteSharedCache([createGuardCacheKey(api.pathVersion, api.code)]),
    invalidatePublicApiCatalogCache(),
    incrementSharedCacheVersion(PUBLIC_STATS_VERSION)
  ])
}

async function findApiByVersionCode(pathVersion: string, code: string) {
  const rows = await db.select().from(apis)
    .where(and(eq(apis.pathVersion, pathVersion), eq(apis.code, code)))
    .limit(1)
  return firstRow(rows)
}

async function updateManifestProjection(
  existing: typeof apis.$inferSelect,
  data: ApiManifestRegistration
) {
  const incomingMethods = normalizeMethodList(data.httpMethod)
  const methodChanged = existing.httpMethod !== incomingMethods
  const hasProjectionChange = existing.apiPath !== data.apiPath
    || methodChanged
    || existing.endpointCount !== data.endpointCount
    || existing.isOrphaned

  if (!hasProjectionChange) return existing

  const patch: Partial<typeof apis.$inferInsert> = {
    apiPath: data.apiPath,
    httpMethod: incomingMethods,
    endpointCount: data.endpointCount,
    isOrphaned: false,
    updatedBy: data.createdBy,
    updatedAt: new Date()
  }

  if (existing.isOrphaned && methodChanged) {
    patch.isEnabled = false
    patch.isStatistics = false
  }

  const rows = await db.update(apis)
    .set(patch)
    .where(eq(apis.id, existing.id))
    .returning()
  const updated = firstRow(rows)
  if (updated) await invalidateApiCaches(updated)

  if (methodChanged) {
    console.warn(
      `[api-manifest] httpMethod changed for ${data.pathVersion}/${data.code}: `
      + `"${existing.httpMethod}" → "${incomingMethods}"${existing.isOrphaned ? ' (orphan recovered, kept disabled for admin review)' : ''}`
    )
  }

  return updated
}

export const apiRegistryService = {
  async listEnabledScopeOptions() {
    const rows = await db.select({
      id: apis.id,
      code: apis.code,
      pathVersion: apis.pathVersion,
      name: apis.name,
      apiPath: apis.apiPath,
      categoryId: apis.categoryId,
      httpMethod: apis.httpMethod
    })
      .from(apis)
      .where(and(eq(apis.isEnabled, true), eq(apis.isOrphaned, false)))
      .orderBy(apis.pathVersion, apis.code)

    return rows.map(row => ({
      ...row,
      scope: `${row.pathVersion}.${row.code}`
    }))
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
  async updateApi(id: number, userId: number | null, data: Partial<typeof apis.$inferInsert>) {
    const {
      code: _code,
      pathVersion: _pv,
      apiPath: _ap,
      httpMethod: _hm,
      endpointCount: _ec,
      isOrphaned: _io,
      ...patch
    } = data as Partial<typeof apis.$inferInsert>

    if (patch.isEnabled === false) {
      patch.isStatistics = false
    }

    const updated = await db.transaction(async (tx) => {
      const existingRows = await tx.select().from(apis)
        .where(eq(apis.id, id))
        .limit(1)
        .for('update')
      const existing = firstRow(existingRows)
      if (!existing) return null

      assertApiGovernanceState({
        isEnabled: patch.isEnabled ?? existing.isEnabled,
        isApiKey: patch.isApiKey ?? existing.isApiKey,
        isStatistics: patch.isStatistics ?? existing.isStatistics,
        isOrphaned: existing.isOrphaned,
        methodCosts: (patch.methodCosts ?? existing.methodCosts) as Record<string, number>
      })

      const rows = await tx.update(apis)
        .set({
          ...patch,
          updatedBy: userId,
          updatedAt: new Date()
        })
        .where(eq(apis.id, id))
        .returning()
      return firstRow(rows)
    })
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
      if (getSqlState(err) !== '23503') throw err
      throw createApplicationError({
        statusCode: 409,
        message: '该接口存在历史调用日志，无法删除；请先在统计页面清理调用日志，或保留接口为禁用状态'
      })
    }
  },

  async toggleApiField(id: number, field: 'isEnabled' | 'isStatistics', value: boolean, updatedBy?: number | null) {
    const updated = await db.transaction(async (tx) => {
      const existingRows = await tx.select().from(apis)
        .where(eq(apis.id, id))
        .limit(1)
        .for('update')
      const existing = firstRow(existingRows)
      if (!existing) return null

      const next = {
        isEnabled: field === 'isEnabled' ? value : existing.isEnabled,
        isStatistics: field === 'isStatistics' ? value : existing.isStatistics
      }
      if (!next.isEnabled) next.isStatistics = false
      assertApiGovernanceState({ ...existing, ...next })

      const rows = await tx.update(apis).set({
        ...next,
        updatedAt: new Date(),
        updatedBy: typeof updatedBy === 'number' && updatedBy > 0 ? updatedBy : null
      }).where(eq(apis.id, id)).returning()
      return firstRow(rows)
    })
    if (updated) await invalidateApiCaches(updated)
    return updated
  },

  /**
   * 一键登记：按 (pathVersion, code) 幂等入库。
   * 已存在则刷新 manifest 投影（apiPath/httpMethod/endpointCount），治理字段保留。
   * 当 orphan 接口被重新注册时（文件夹回归），自动清除 isOrphaned 标志；
   * isEnabled/isStatistics 仍保持原值（admin 需要主动启用，避免静默上线）。
   */
  async registerFromManifest(data: ApiManifestRegistration) {
    assertApiGovernanceState({ ...data.defaults, isOrphaned: false })

    const existing = await findApiByVersionCode(data.pathVersion, data.code)
    if (existing) {
      return updateManifestProjection(existing, data)
    }

    try {
      const rows = await db.insert(apis).values({
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
      const inserted = firstRow(rows)
      if (inserted) await invalidateApiCaches(inserted)
      return inserted
    } catch (error) {
      if (getSqlState(error) !== '23505') throw error
      const concurrent = await findApiByVersionCode(data.pathVersion, data.code)
      if (!concurrent) throw error
      return updateManifestProjection(concurrent, data)
    }
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
