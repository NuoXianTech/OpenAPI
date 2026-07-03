// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../../.nuxt/types/api-manifest.d.ts" />
/**
 * 启动期对账：manifest（构建期扫盘）↔ apis 表
 *
 * 同步行为：
 * - manifest 有 / DB 无（unregistered）：以 DEFAULT_API_REGISTRATION 入库，留待 admin 启用。
 * - manifest 有 / DB 有：刷新 apiPath / httpMethod / endpointCount；
 *   若 DB 行原本是 orphan，registerFromManifest 会自动清除 isOrphaned；
 *   若 httpMethod 集合变化（新增 / 减少了 xxx.<method>.ts），从 orphan 回归时保持禁用。
 * - manifest 无 / DB 有（orphaned）：调 markOrphaned，强制 isEnabled=false / isStatistics=false，
 *   DB 行保留，admin 仍可改分类等元数据但不能再启用。
 *
 * 数据库可能在迁移中暂不可用，启动期做有限次重试，失败不阻塞进程。
 */

import { apis } from '@nuxthub/db/schema'
import { eq } from 'drizzle-orm'
import { API_MANIFEST as RAW_API_MANIFEST } from '#api-manifest'
import { apiService } from '~~/server/service/apiService'
import { DEFAULT_API_REGISTRATION } from '~~/shared/config/api-guard'
import type { ManifestApi } from '~~/shared/types/api-guard'

const API_MANIFEST = RAW_API_MANIFEST as readonly ManifestApi[]

const RETRY_DELAYS_MS = [500, 1000, 2000, 3000, 4000]

export default defineNitroPlugin(() => {
  void runWhenDbReady()
})

async function runWhenDbReady() {
  for (let attempt = 0; attempt < RETRY_DELAYS_MS.length; attempt++) {
    await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS_MS[attempt]!))
    const ok = await checkConsistency()
    if (ok) return
  }
  console.warn('[api-manifest] Database check failed after retries. Check database connectivity and migrations.')
}

function inferApiPath(api: ManifestApi): string {
  const baseEp = api.endpoints.find(e => e.paramNames.length === 0) || api.endpoints[0]
  if (!baseEp) return `/${api.pathVersion}/${api.code}`
  return baseEp.apiPath.replace(/\/:[^/]+$/, '') || `/${api.pathVersion}/${api.code}`
}

function inferHttpMethod(api: ManifestApi): string {
  const methods = Array.from(new Set(api.endpoints.map(e => e.method))).filter(m => m !== 'ANY')
  return methods.length > 0 ? methods.join(',') : 'GET'
}

async function checkConsistency(): Promise<boolean> {
  let dbRows: Array<{ id: number, code: string, pathVersion: string, endpointCount: number, isOrphaned: boolean }>
  try {
    dbRows = await db.select({
      id: apis.id,
      code: apis.code,
      pathVersion: apis.pathVersion,
      endpointCount: apis.endpointCount,
      isOrphaned: apis.isOrphaned
    }).from(apis)
  } catch {
    return false
  }

  const manifestKeys = new Set(API_MANIFEST.map((a: ManifestApi) => `${a.pathVersion}:${a.code}`))
  const dbKeys = new Set(dbRows.map(r => `${r.pathVersion}:${r.code}`))

  const unregistered = API_MANIFEST.filter((a: ManifestApi) => !dbKeys.has(`${a.pathVersion}:${a.code}`))
  // orphan 候选：DB 中存在但 manifest 中已无（且 pathVersion 仍是 v* 形态，过滤异常历史数据）
  const orphanCandidates = dbRows
    .filter(r => r.pathVersion && r.pathVersion.startsWith('v') && !manifestKeys.has(`${r.pathVersion}:${r.code}`))

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
          endpointCount: a.endpoints.length,
          createdBy: null,
          defaults: {
            name: a.code,
            shortDesc: `${a.pathVersion} ${a.code}`,
            description: `Auto-registered from manifest: ${a.pathVersion}/${a.code}`,
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
            methodCosts: DEFAULT_API_REGISTRATION.methodCosts,
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
        `[api-manifest] Auto-registered ${registered.length} new APIs; enable them in admin:`,
        registered.join(', ')
      )
    }
    if (failed.length > 0) {
      console.error('[api-manifest] Auto-registration failed:', failed)
    }
  }

  // 标记新增 orphan：跳过已被标过 orphan 的（幂等）
  const newlyOrphaned = orphanCandidates.filter(r => !r.isOrphaned)
  if (newlyOrphaned.length > 0) {
    for (const r of newlyOrphaned) {
      try {
        await apiService.markOrphaned(r.id)
      } catch (err) {
        console.error('[api-manifest] failed to mark orphan', { id: r.id, key: `${r.pathVersion}/${r.code}`, err })
      }
    }
    console.warn(
      `[api-manifest] Marked ${newlyOrphaned.length} APIs as orphaned (source folder removed). `
      + 'They are auto-disabled; admin can edit metadata but cannot re-enable until folder returns.'
    )
    for (const r of newlyOrphaned) {
      console.warn(`  - ${r.pathVersion}/${r.code} (id=${r.id})`)
    }
  }

  // 同步 endpointCount（manifest 有 + DB 有 + 不在 orphan）
  for (const a of API_MANIFEST) {
    const row = dbRows.find(r => r.pathVersion === a.pathVersion && r.code === a.code)
    if (!row) continue
    if (row.endpointCount === a.endpoints.length) continue
    await db.update(apis)
      .set({ endpointCount: a.endpoints.length })
      .where(eq(apis.id, row.id))
      .catch((err: unknown) => {
        console.error('[api-manifest] failed to sync endpointCount', { id: row.id, err })
      })
  }

  return true
}
