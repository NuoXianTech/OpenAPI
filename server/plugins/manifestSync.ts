// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../../.nuxt/types/api-manifest.d.ts" />
/**
 * Validate the generated API manifest against the business database on startup.
 *
 * Behavior:
 * - APIs present in the manifest but missing from the database are registered
 *   with DEFAULT_API_REGISTRATION and left disabled for admin review.
 * - APIs present in the database but missing from the manifest are reported as
 *   likely removed or renamed source files.
 *
 * The database may still be unavailable while migrations are being applied, so
 * startup retries briefly and then gives up without blocking the app process.
 */

import { apis } from '@nuxthub/db/schema'
import { eq } from 'drizzle-orm'
import { API_MANIFEST as RAW_API_MANIFEST } from '#api-manifest'
import { apiService } from '~~/server/service/apiService'
import { DEFAULT_API_REGISTRATION } from '~~/shared/config/apiGuard'
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
  let dbRows: Array<{ id: number, code: string, pathVersion: string, endpointCount: number }>
  try {
    dbRows = await db.select({
      id: apis.id,
      code: apis.code,
      pathVersion: apis.pathVersion,
      endpointCount: apis.endpointCount
    }).from(apis)
  } catch {
    return false
  }

  const manifestKeys = new Set(API_MANIFEST.map((a: ManifestApi) => `${a.pathVersion}:${a.code}`))
  const dbKeys = new Set(dbRows.map(r => `${r.pathVersion}:${r.code}`))

  const unregistered = API_MANIFEST.filter((a: ManifestApi) => !dbKeys.has(`${a.pathVersion}:${a.code}`))
  const orphaned = dbRows.filter(r => r.pathVersion && !manifestKeys.has(`${r.pathVersion}:${r.code}`))
    .filter(r => r.pathVersion.startsWith('v'))

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

  if (orphaned.length > 0) {
    console.warn(
      `[api-manifest] ${orphaned.length} database APIs are missing from the manifest. `
      + 'They may have been removed or renamed.'
    )
    for (const r of orphaned) {
      console.warn(`  - ${r.pathVersion}/${r.code} (id=${r.id})`)
    }
  }

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
