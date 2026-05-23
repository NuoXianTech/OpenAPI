/**
 * Admin · 发现 v{N} 下所有 API 路由，与 DB 中已登记记录做 LEFT JOIN。
 *
 * 返回结构按 pathVersion 分组，每个 (pathVersion, code) 一行，endpoints 展开在子项中。
 * 前端 admin 页按版本 tab 渲染：未登记的显示"登记"按钮；已登记的可直接编辑治理字段。
 *
 * registered 字段包含完整治理配置，避免前端为打开编辑弹窗再发一次请求。
 */

import type { H3Event } from 'h3'
import { API_MANIFEST } from '#api-manifest'
import { requireAdmin } from '~~/server/utils/auth'
import { apiService } from '~~/server/service/apiService'
import type { ManifestEndpoint } from '~~/shared/types/api-guard'

interface DiscoveredEndpoint {
  apiPath: string
  method: string
  sourceFile: string
  isDynamic: boolean
}

type RegisteredApi = Awaited<ReturnType<typeof apiService.listByVersion>>[number]

interface DiscoveredApi {
  pathVersion: string
  code: string
  endpointCount: number
  endpoints: DiscoveredEndpoint[]
  /** DB 中已登记记录的完整治理字段；null 表示尚未登记 */
  registered: RegisteredApi | null
  /** true 表示 DB 有但代码已被删除 */
  orphaned: boolean
}

interface VersionGroup {
  pathVersion: string
  apis: DiscoveredApi[]
  stats: {
    total: number
    registered: number
    unregistered: number
    orphaned: number
  }
}

export default defineEventHandler(async (event: H3Event) => {
  await requireAdmin(event)

  const versions = Array.from(new Set(API_MANIFEST.map(a => a.pathVersion)))
  const registeredMap = new Map<string, RegisteredApi>()
  for (const version of versions) {
    const rows = await apiService.listByVersion(version)
    for (const row of rows) registeredMap.set(`${row.pathVersion}:${row.code}`, row)
  }

  const grouped = new Map<string, VersionGroup>()
  function ensureGroup(pathVersion: string) {
    let group = grouped.get(pathVersion)
    if (!group) {
      group = {
        pathVersion,
        apis: [],
        stats: { total: 0, registered: 0, unregistered: 0, orphaned: 0 }
      }
      grouped.set(pathVersion, group)
    }
    return group
  }

  for (const api of API_MANIFEST) {
    const key = `${api.pathVersion}:${api.code}`
    const registered = registeredMap.get(key) ?? null
    const endpoints: DiscoveredEndpoint[] = api.endpoints.map((ep: ManifestEndpoint) => ({
      apiPath: ep.apiPath,
      method: ep.method,
      sourceFile: ep.sourceFile,
      isDynamic: ep.paramNames.length > 0 || ep.isCatchAll
    }))

    const group = ensureGroup(api.pathVersion)
    group.apis.push({
      pathVersion: api.pathVersion,
      code: api.code,
      endpointCount: api.endpoints.length,
      endpoints,
      registered,
      orphaned: false
    })
    group.stats.total += 1
    if (registered) group.stats.registered += 1
    else group.stats.unregistered += 1
  }

  // 孤儿记录：DB 有但 manifest 没了
  const manifestKeys = new Set(API_MANIFEST.map(a => `${a.pathVersion}:${a.code}`))
  for (const [, row] of registeredMap) {
    if (manifestKeys.has(`${row.pathVersion}:${row.code}`)) continue
    const group = ensureGroup(row.pathVersion)
    group.apis.push({
      pathVersion: row.pathVersion,
      code: row.code,
      endpointCount: row.endpointCount,
      endpoints: [],
      registered: row,
      orphaned: true
    })
    group.stats.total += 1
    group.stats.registered += 1
    group.stats.orphaned += 1
  }

  const result = Array.from(grouped.values()).sort((a, b) => a.pathVersion.localeCompare(b.pathVersion))
  for (const g of result) g.apis.sort((a, b) => a.code.localeCompare(b.code))

  return { versions: result }
})
