/**
 * 过期记录 GC · Nitro plugin
 *
 * 启动后每小时清理一次：
 *   - api_rate_limit_buckets：postgres 限流 driver 的滑动窗口桶，过期后无人查询
 *   - sessions：expiresAt 已过的会话
 *   - verification_tokens：expiresAt 已过的一次性 token（含已 consumed/revoked 的旧记录）
 *
 * 单实例假设：与 pendingChargesRetry 一致，依赖单点部署。多实例可直接保留 —— DELETE 是
 * 幂等操作，并发跑只是浪费一次扫描，不会出错。
 *
 * dev HMR 友好：全局 Symbol 注册 timer 句柄，热更新前清掉上一轮。
 */

import { apiRateLimitService } from '~~/server/service/apiRateLimitService'
import { sessionService } from '~~/server/service/sessionService'
import { verificationTokenService } from '~~/server/service/verificationTokenService'

const SCAN_INTERVAL_MS = 60 * 60 * 1_000
const TIMER_KEY = Symbol.for('gcExpired.timer')

type GlobalWithTimer = typeof globalThis & {
  [TIMER_KEY]?: NodeJS.Timeout
}

async function runOnce() {
  const jobs: Array<[string, () => Promise<void>]> = [
    ['api_rate_limit_buckets', () => apiRateLimitService.cleanupExpired()],
    ['sessions', () => sessionService.deleteExpiredSessions()],
    ['verification_tokens', () => verificationTokenService.deleteExpired()]
  ]
  for (const [name, job] of jobs) {
    try {
      await job()
    } catch (err) {
      console.error('[gc-expired] cleanup failed', { table: name, error: (err as Error).message })
    }
  }
}

export default defineNitroPlugin(() => {
  const g = globalThis as GlobalWithTimer
  if (g[TIMER_KEY]) {
    clearInterval(g[TIMER_KEY])
  }

  // 不在启动时立即跑：dev 下 NuxtHub pglite 是懒迁移，nitro plugin 比迁移更早执行，
  // 此时表还不存在。GC 本身不紧急，等首个 interval 触发即可。
  const timer = setInterval(() => {
    void runOnce()
  }, SCAN_INTERVAL_MS)
  if (typeof timer.unref === 'function') timer.unref()
  g[TIMER_KEY] = timer
})
