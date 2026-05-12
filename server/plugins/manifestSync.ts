// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../../.nuxt/types/api-manifest.d.ts" />
/**
 * 启动时校验 manifest ↔ DB 一致性。
 *
 * 行为：
 *   A. manifest 中存在、DB 中未登记 → 自动按 DEFAULT_API_REGISTRATION 登记（isEnabled=false）
 *      admin 可在后台启用与调整治理参数；此前的"代码写了但漏登记"告警转为 INFO
 *   B. DB 中存在、manifest 中不存在  → 仅 WARN 提示「源文件可能被删」
 *
 * 启动时 NuxtHub 还在跑迁移、表可能尚未就绪，因此用指数退避重试，
 * 等待 DB ready 后再做一次性校验，最多等 ~10s 后放弃（不阻塞应用）。
 *
 * 头部 triple-slash reference：modules/api-manifest.ts 用 addTypeTemplate 注册的
 * #api-manifest 类型只挂到 app 端；server tsconfig 不自动包含，需手动 reference。
 */

import { apis } from '@nuxthub/db/schema'
import { eq } from 'drizzle-orm'
import { API_MANIFEST as RAW_API_MANIFEST } from '#api-manifest'
import { apiService } from '~~/server/service/apiService'
import { DEFAULT_API_REGISTRATION } from '~~/shared/config/apiGuard'
import type { ManifestApi } from '~~/shared/types/api-guard'

// 显式 cast：dev 重启期间 .nuxt/types/api-manifest.d.ts 可能尚未生成完毕，
// 直接 cast 到 ManifestApi[] 避免 IDE 把 API_MANIFEST 推断为 any。
const API_MANIFEST = RAW_API_MANIFEST as readonly ManifestApi[]

const RETRY_DELAYS_MS = [500, 1000, 2000, 3000, 4000] // 总计 ~10.5s

export default defineNitroPlugin(() => {
  void runWhenDbReady()
})

async function runWhenDbReady() {
  for (let attempt = 0; attempt < RETRY_DELAYS_MS.length; attempt++) {
    await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS_MS[attempt]!))
    const ok = await checkConsistency()
    if (ok) return
  }
  console.warn('[api-manifest] DB 校验在多次重试后仍未成功，已放弃；请检查数据库连接与迁移')
}

/**
 * 从 manifest 推断对外展示路径（去掉末尾动态段，例 /v1/user/:id → /v1/user）。
 * 与 server/api/admin/apis/register.post.ts 中的逻辑保持一致。
 */
function inferApiPath(api: ManifestApi): string {
  const baseEp = api.endpoints.find(e => e.paramNames.length === 0) || api.endpoints[0]
  if (!baseEp) return `/${api.pathVersion}/${api.code}`
  return baseEp.apiPath.replace(/\/:[^/]+$/, '') || `/${api.pathVersion}/${api.code}`
}

function inferHttpMethod(api: ManifestApi): string {
  const methods = Array.from(new Set(api.endpoints.map(e => e.method))).filter(m => m !== 'ANY')
  return methods.length > 0 ? methods.join(',') : 'GET'
}

/** @returns true 表示查询成功（无论是否有告警），false 表示查询本身失败 */
async function checkConsistency(): Promise<boolean> {
  let dbRows: Array<{ id: number, code: string, pathVersion: string, sourceDir: string | null }>
  try {
    dbRows = await db.select({
      id: apis.id,
      code: apis.code,
      pathVersion: apis.pathVersion,
      sourceDir: apis.sourceDir
    }).from(apis)
  } catch {
    // 表尚未建好或连接未就绪 → 静默重试
    return false
  }

  const manifestKeys = new Set(API_MANIFEST.map((a: ManifestApi) => `${a.pathVersion}:${a.code}`))
  const dbKeys = new Set(dbRows.map(r => `${r.pathVersion}:${r.code}`))

  const unregistered = API_MANIFEST.filter((a: ManifestApi) => !dbKeys.has(`${a.pathVersion}:${a.code}`))
  const orphaned = dbRows.filter(r => r.pathVersion && !manifestKeys.has(`${r.pathVersion}:${r.code}`))
    .filter(r => r.pathVersion.startsWith('v')) // 只关注治理范围内的版本

  // A. 自动登记 manifest 中尚未入库的 API（默认 isEnabled=false，admin 后台显式启用）
  if (unregistered.length > 0) {
    const registered: string[] = []
    const failed: Array<{ key: string, err: unknown }> = []
    for (const a of unregistered) {
      try {
        await apiService.registerFromManifest({
          pathVersion: a.pathVersion,
          code: a.code,
          apiPath: inferApiPath(a),
          httpMethod: inferHttpMethod(a),
          sourceDir: a.sourceDir,
          endpointCount: a.endpoints.length,
          createdBy: null, // 系统自动登记，无 admin id
          defaults: {
            name: a.code,
            shortDesc: `${a.pathVersion} ${a.code}`,
            description: `自动登记于 ${a.sourceDir}`,
            docUrl: '',
            status: DEFAULT_API_REGISTRATION.status,
            categoryId: null,
            isEnabled: DEFAULT_API_REGISTRATION.isEnabled,
            isApiKey: DEFAULT_API_REGISTRATION.isApiKey,
            isStatistics: DEFAULT_API_REGISTRATION.isStatistics,
            rateLimitPerSecond: DEFAULT_API_REGISTRATION.rateLimitPerSecond,
            rateLimitPerMinute: DEFAULT_API_REGISTRATION.rateLimitPerMinute,
            rateLimitPerHour: DEFAULT_API_REGISTRATION.rateLimitPerHour,
            rateLimitPerDay: DEFAULT_API_REGISTRATION.rateLimitPerDay,
            dailyQuota: DEFAULT_API_REGISTRATION.dailyQuota,
            costCredits: DEFAULT_API_REGISTRATION.costCredits,
            timeoutMs: DEFAULT_API_REGISTRATION.timeoutMs
          }
        })
        registered.push(`${a.pathVersion}/${a.code}`)
      } catch (err) {
        failed.push({ key: `${a.pathVersion}/${a.code}`, err })
      }
    }
    if (registered.length > 0) {
      console.info(
        `[api-manifest] ✓ 自动登记 ${registered.length} 条新 API（默认未启用，请在 admin 后台开启）：`,
        registered.join(', ')
      )
    }
    if (failed.length > 0) {
      console.error('[api-manifest] 自动登记失败：', failed)
    }
  }

  if (orphaned.length > 0) {
    console.warn(
      `[api-manifest] ⚠ 以下 ${orphaned.length} 条 DB 记录对应的源文件不存在，`
      + `可能已删除或重命名，请检查：`
    )
    for (const r of orphaned) {
      console.warn(`  - ${r.pathVersion}/${r.code}  (id=${r.id})  ${r.sourceDir || ''}`)
    }
  }

  // 同步 manifest 的 endpointCount / sourceDir 到 DB，admin 列表展示用
  for (const a of API_MANIFEST) {
    const row = dbRows.find(r => r.pathVersion === a.pathVersion && r.code === a.code)
    if (!row) continue
    if (row.sourceDir === a.sourceDir) continue
    await db.update(apis)
      .set({ endpointCount: a.endpoints.length, sourceDir: a.sourceDir })
      .where(eq(apis.id, row.id))
      .catch((err: unknown) => {
        console.error('[api-manifest] failed to sync endpointCount', { id: row.id, err })
      })
  }

  return true
}
