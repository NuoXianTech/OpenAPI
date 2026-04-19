/**
 * Admin · 发现 v{N} 下所有 API 路由，与 DB 中已登记记录做 LEFT JOIN。
 *
 * 返回结构按 pathVersion 分组，每个 api 一行，endpoints 展开在子项中。
 * 前端 admin 页按版本 tab 渲染，未登记的显示"一键登记"按钮。
 */

import type { H3Event } from 'h3'
import { API_MANIFEST } from '#api-manifest'
import { requireAdmin } from '~~/server/utils/auth'
import { apiService } from '~~/server/service/apiService'
import { report } from '~~/server/utils/report'

interface DiscoveredEndpoint {
  apiPath: string
  method: string
  sourceFile: string
  isDynamic: boolean
}

interface DiscoveredApi {
  pathVersion: string
  code: string
  sourceDir: string
  endpointCount: number
  endpoints: DiscoveredEndpoint[]
  registered: {
    id: number
    name: string
    isEnabled: boolean
    isApiKey: boolean
    isStatistics: boolean
    requiresAuth: boolean
    rateLimitPerMinute: number
    rateLimitPerHour: number
    dailyQuota: number
    updatedAt: Date
  } | null
}

interface VersionGroup {
  pathVersion: string
  apis: DiscoveredApi[]
  stats: {
    total: number
    registered: number
    unregistered: number
  }
}

export default defineEventHandler(async (event: H3Event) => {
  await requireAdmin(event)

  // 拿所有登记过的 apis，按 (pathVersion, code) 建索引
  const versions = Array.from(new Set(API_MANIFEST.map(a => a.pathVersion)))
  const registeredMap = new Map<string, Awaited<ReturnType<typeof apiService.listByVersion>>[number]>()
  for (const version of versions) {
    const rows = await apiService.listByVersion(version)
    for (const row of rows) registeredMap.set(`${row.pathVersion}:${row.code}`, row)
  }

  const grouped = new Map<string, VersionGroup>()
  for (const api of API_MANIFEST) {
    const key = `${api.pathVersion}:${api.code}`
    const registered = registeredMap.get(key) ?? null
    const endpoints: DiscoveredEndpoint[] = api.endpoints.map(ep => ({
      apiPath: ep.apiPath,
      method: ep.method,
      sourceFile: ep.sourceFile,
      isDynamic: ep.paramNames.length > 0 || ep.isCatchAll,
    }))

    const entry: DiscoveredApi = {
      pathVersion: api.pathVersion,
      code: api.code,
      sourceDir: api.sourceDir,
      endpointCount: api.endpoints.length,
      endpoints,
      registered: registered
        ? {
            id: registered.id,
            name: registered.name,
            isEnabled: registered.isEnabled,
            isApiKey: registered.isApiKey,
            isStatistics: registered.isStatistics,
            requiresAuth: registered.requiresAuth,
            rateLimitPerMinute: registered.rateLimitPerMinute,
            rateLimitPerHour: registered.rateLimitPerHour,
            dailyQuota: registered.dailyQuota,
            updatedAt: registered.updatedAt,
          }
        : null,
    }

    const group = grouped.get(api.pathVersion) ?? {
      pathVersion: api.pathVersion,
      apis: [],
      stats: { total: 0, registered: 0, unregistered: 0 },
    }
    group.apis.push(entry)
    group.stats.total += 1
    if (registered) group.stats.registered += 1
    else group.stats.unregistered += 1
    grouped.set(api.pathVersion, group)
  }

  // 额外检测"DB 有但代码没了"的孤儿记录，展示在各自版本下
  const manifestKeys = new Set(API_MANIFEST.map(a => `${a.pathVersion}:${a.code}`))
  for (const [, row] of registeredMap) {
    if (manifestKeys.has(`${row.pathVersion}:${row.code}`)) continue
    const group = grouped.get(row.pathVersion) ?? {
      pathVersion: row.pathVersion,
      apis: [],
      stats: { total: 0, registered: 0, unregistered: 0 },
    }
    group.apis.push({
      pathVersion: row.pathVersion,
      code: row.code,
      sourceDir: row.sourceDir || '(已删除)',
      endpointCount: row.endpointCount,
      endpoints: [],
      registered: {
        id: row.id,
        name: row.name,
        isEnabled: row.isEnabled,
        isApiKey: row.isApiKey,
        isStatistics: row.isStatistics,
        requiresAuth: row.requiresAuth,
        rateLimitPerMinute: row.rateLimitPerMinute,
        rateLimitPerHour: row.rateLimitPerHour,
        dailyQuota: row.dailyQuota,
        updatedAt: row.updatedAt,
      },
    })
    grouped.set(row.pathVersion, group)
  }

  const result = Array.from(grouped.values()).sort((a, b) => a.pathVersion.localeCompare(b.pathVersion))
  for (const g of result) g.apis.sort((a, b) => a.code.localeCompare(b.code))

  return report(event, 200, 'ok', { versions: result })
})
