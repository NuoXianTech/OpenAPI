/**
 * API 调用结果显式标记 · 业务 handler 用。
 *
 * 默认行为：finish 时按 statusCode 判定成功/失败，仅 2xx/3xx 扣费。
 *
 * markApiCallFailed 的两个用途：
 *   1. 把可读的业务失败码 / 文案写入 `apiCalls.errorCode` / `errorMessage`
 *      —— 默认仅 forcedOutcome='failed' 才会持久化这两个字段（见 plugins/apiCallStats.ts）
 *   2. 极少数业务必须返回 2xx 但仍要跳过扣费（罕见）
 *
 * 反过来，若 handler 抛错 / 返回 5xx 但业务实际上已完成、想正常扣费，
 * 可以调用 markApiCallSuccess（极少用）。
 *
 * 使用示例：
 * ```ts
 * import { markApiCallFailed } from '~~/server/utils/apiCallOutcome'
 * import { openApiFail, openApiOk } from '~~/server/utils/openApiResponse'
 *
 * export default defineEventHandler(async (event) => {
 *   try {
 *     const data = await fetchUpstream()
 *     return openApiOk(event, data)
 *   }
 *   catch (err) {
 *     // 上游失败：HTTP 502 自动跳过扣费；markApiCallFailed 把 bizCode 写进调用日志
 *     markApiCallFailed(event, 'UPSTREAM_ERROR', (err as Error).message)
 *     return openApiFail(event, 502, 'UPSTREAM_ERROR', '上游服务异常')
 *   }
 * })
 * ```
 */

import type { H3Event } from 'h3'

/** 标记本次调用业务成功 · finish 时按成功扣费 */
export function markApiCallSuccess(event: H3Event) {
  if (!event.context.apiBilling) return
  event.context.apiBilling.forcedOutcome = 'success'
  event.context.apiBilling.failedCode = null
  event.context.apiBilling.failedMessage = null
}

/** 标记本次调用业务失败 · finish 时跳过扣费，并将错误明细写入 apiCalls */
export function markApiCallFailed(event: H3Event, code?: string | null, message?: string | null) {
  if (!event.context.apiBilling) return
  event.context.apiBilling.forcedOutcome = 'failed'
  event.context.apiBilling.failedCode = (code || '').slice(0, 50) || null
  event.context.apiBilling.failedMessage = (message || '').slice(0, 500) || null
}

/**
 * 判定是否应当对该次调用扣费。
 * 规则：
 *   - costCredits === 0 → 永远不扣
 *   - apiKeyUserId 为 null → 没有归属用户，不扣
 *   - forcedOutcome === 'failed' → 跳过扣费
 *   - forcedOutcome === 'success' → 必扣
 *   - forcedOutcome === null → 按 statusCode 判定（2xx/3xx 扣，4xx/5xx 不扣）
 */
export function shouldCharge(opts: {
  costCredits: number
  apiKeyUserId: number | null
  forcedOutcome: 'success' | 'failed' | null
  statusCode: number
}): boolean {
  if (opts.costCredits <= 0) return false
  if (!opts.apiKeyUserId) return false
  if (opts.forcedOutcome === 'failed') return false
  if (opts.forcedOutcome === 'success') return true
  return opts.statusCode >= 200 && opts.statusCode < 400
}
