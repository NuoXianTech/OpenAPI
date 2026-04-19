/**
 * 启动时校验 manifest ↔ DB 一致性。
 *
 * 告警项（仅日志，不阻塞启动）：
 *   A. manifest 中存在、DB 中不存在 → "代码写了但没登记"
 *   B. DB 中存在、manifest 中不存在 → "DB 有记录但文件被删了"
 *
 * 启动后延迟 500ms 执行，避免与 DB 连接初始化竞争。
 */

import { apis } from '@nuxthub/db/schema'
import { eq } from 'drizzle-orm'
import { API_MANIFEST } from '#api-manifest'

export default defineNitroPlugin(() => {
  setTimeout(() => {
    void checkConsistency()
  }, 500)
})

async function checkConsistency() {
  try {
    const dbRows = await db.select({
      id: apis.id,
      code: apis.code,
      pathVersion: apis.pathVersion,
      sourceDir: apis.sourceDir,
    }).from(apis)

    const manifestKeys = new Set(API_MANIFEST.map(a => `${a.pathVersion}:${a.code}`))
    const dbKeys = new Set(dbRows.map(r => `${r.pathVersion}:${r.code}`))

    const unregistered = API_MANIFEST.filter(a => !dbKeys.has(`${a.pathVersion}:${a.code}`))
    const orphaned = dbRows.filter(r => r.pathVersion && !manifestKeys.has(`${r.pathVersion}:${r.code}`))
      .filter(r => r.pathVersion.startsWith('v')) // 只关注治理范围内的版本

    if (unregistered.length > 0) {
      console.warn(
        `[api-manifest] ⚠ 以下 ${unregistered.length} 条 API 代码存在但 DB 未登记，`
        + `访问时将返回 403，请在 admin 后台完成登记：`,
      )
      for (const a of unregistered) {
        const methods = Array.from(new Set(a.endpoints.map(e => e.method))).join(', ')
        console.warn(`  - ${a.pathVersion}/${a.code}  [${methods}]  ${a.sourceDir}`)
      }
    }

    if (orphaned.length > 0) {
      console.warn(
        `[api-manifest] ⚠ 以下 ${orphaned.length} 条 DB 记录对应的源文件不存在，`
        + `可能已删除或重命名，请检查：`,
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
  }
  catch (err) {
    console.error('[api-manifest] 一致性校验失败：', (err as Error).message)
  }
}
