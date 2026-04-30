/**
 * API 调用结果显式标记 · 业务 handler 用。
 *
 * 默认行为：finish 时按 statusCode 判定成功/失败，仅成功扣费。
 * 但部分场景下 handler 返回 200 但业务侧失败（上游接口错、参数错等业务语义），
 * 此时调用 markApiCallFailed 强制标记失败，避免错误扣费。
 *
 * 反过来，若 handler 抛错 / 返回 500 但业务实际上已完成、想正常扣费，
 * 可以调用 markApiCallSuccess（极少用）。
 *
 * 使用示例：
 * ```ts
 * import { markApiCallFailed } from '~~/server/utils/apiCallOutcome'
 *
 * export default defineEventHandler(async (event) => {
 *   try {
 *     const data = await fetchUpstream()
 *     return report(event, 200, 'ok', data)
 *   }
 *   catch (err) {
 *     // 上游失败，统一返回 200 + code=1 的业务错；但要避免扣费
 *     markApiCallFailed(event, 'UPSTREAM_ERROR', (err as Error).message)
 *     return report(event, 200, '上游服务异常', null)
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
