/**
 * API call statistics Nitro plugin.
 *
 * The plugin only records calls that the API gate has resolved to a registered
 * statistics target. This keeps the logging rules aligned with docs:
 * unknown routes, unregistered APIs, and APIs with isStatistics=false do not
 * create api_calls or api_call_stats rows.
 */

import type { H3Event } from 'h3'
import { apiCallService } from '~~/server/services/api-call-service'
import { apiKeyService } from '~~/server/services/api-key-service'
import { creditService } from '~~/server/services/credit-service'
import { pendingChargeService } from '~~/server/services/pending-charge-service'
import { shouldCharge } from '~~/server/utils/api-call-outcome'
import type { ApiStatsTracked } from '~~/server/types/api-guard'
import { toNullableNonNegativeInteger } from '~~/server/utils/number'

// 调用日志写入规则：
//   - DO_NOT_WRITE_LOG_OUTCOMES：完全不写 apiCalls 行
//     · invalid_api_key / missing_api_key：API 密钥无效
//     · disabled：公共接口被禁用（接口禁用时直接关闭所有调用日志/统计）
//   - NON_COUNTED_REJECTION_OUTCOMES：已识别请求主体的 gate 拒绝会写 apiCalls，
//     但 isCounted=false，不参与成功率或调用量聚合。
const DO_NOT_WRITE_LOG_OUTCOMES = new Set([
  'disabled',
  'invalid_api_key',
  'missing_api_key'
])

const NON_COUNTED_REJECTION_OUTCOMES = new Set([
  'api_key_quota_exceeded',
  'disabled_api_key',
  'expired_api_key',
  'insufficient_credits',
  'ip_denied',
  'quota_exceeded',
  'quota_unavailable',
  'rate_limited',
  'rate_limit_unavailable',
  'scope_denied'
])

async function recordCall(event: H3Event, tracked: ApiStatsTracked) {
  const response = event.node?.res
  const statusCode = Math.trunc(response?.statusCode || 200)
  const responseSize = toNullableNonNegativeInteger(
    response?.getHeader('content-length') as string | string[] | number | undefined
  )
  const latencyMs = Math.max(Date.now() - tracked.startedAt, 0)
  let quotaReservation: { apiKeyId: number, amount: number } | null = null
  let willCharge = false
  let hasCallRecord = false

  try {
    const target = event.context.apiStatsTarget
      ? { apiId: event.context.apiStatsTarget.apiId, apiPath: event.context.apiStatsTarget.apiPath }
      : null
    if (!target) {
      return
    }

    const rejection = event.context.apiGateRejection ?? null

    if (rejection && DO_NOT_WRITE_LOG_OUTCOMES.has(rejection.outcome)) {
      return
    }

    const isCounted = !rejection || !NON_COUNTED_REJECTION_OUTCOMES.has(rejection.outcome)

    const apiKeyId = event.context.apiKey?.id
      ?? rejection?.apiKeyId
      ?? null
    const apiKeyName = event.context.apiKey?.name
      ?? rejection?.apiKeyName
      ?? null
    const apiKeyUserId = event.context.apiKey?.userId
      ?? rejection?.apiKeyUserId
      ?? null
    const billing = event.context.apiBilling

    willCharge = billing
      ? shouldCharge({
          costCredits: billing.costCredits,
          apiKeyUserId: billing.apiKeyUserId,
          forcedOutcome: billing.forcedOutcome,
          statusCode
        })
      : false
    quotaReservation = billing?.apiKeyQuotaReservation ?? null

    const errorCode = rejection
      ? rejection.errorCode
      : billing?.forcedOutcome === 'failed' ? (billing.failedCode || 'BUSINESS_FAILED') : null
    const errorMessage = rejection
      ? rejection.errorMessage
      : billing?.forcedOutcome === 'failed' ? billing.failedMessage : null

    const statStatusCode = billing?.forcedOutcome === 'failed' && statusCode < 400
      ? 500
      : statusCode

    const callInput = {
      apiId: target.apiId,
      apiKeyId,
      apiKeyName,
      userId: apiKeyUserId,
      requestId: event.context.requestId ?? null,
      path: tracked.pathname,
      method: tracked.method,
      statusCode,
      latencyMs,
      ip: tracked.ip,
      userAgent: tracked.userAgent,
      referer: tracked.referer,
      queryString: tracked.queryString,
      requestSize: tracked.requestSize,
      responseSize,
      statDate: new Date(),
      errorCode,
      errorMessage,
      creditsCost: 0,
      isCounted,
      statusCodeForStats: statStatusCode
    }
    const callId = !isCounted
      ? (await apiCallService.addCall(callInput))[0]?.id ?? null
      : await apiCallService.addCallAndUpsertDailyStat(callInput)
    hasCallRecord = callId !== null

    if (willCharge && billing && billing.apiKeyUserId && callId) {
      const remark = `API 调用扣费 · ${target.apiPath}`
      try {
        // 调用已发生、上游成本已产生 → forceCharge 必扣（余额不足扣成负数，由 api-gate
        // 挡住后续调用）。下面的 catch 只会捕获瞬时故障（如 DB 抖动），那种才值得进
        // 重试队列；余额不足不再入队空转。
        const r = await creditService.forceCharge({
          userId: billing.apiKeyUserId,
          amount: billing.costCredits,
          apiId: target.apiId,
          apiCallId: callId,
          remark
        })
        if (r.charged > 0) {
          await apiCallService.patchCreditsCost(callId, r.charged)
        }
      } catch (err) {
        const error = (err as Error).message || 'charge failed'
        console.error('failed to charge credits after api call, enqueuing for retry', {
          callId,
          userId: billing.apiKeyUserId,
          amount: billing.costCredits,
          error
        })
        try {
          await pendingChargeService.enqueue({
            apiCallId: callId,
            userId: billing.apiKeyUserId,
            apiId: target.apiId,
            amount: billing.costCredits,
            remark,
            error
          })
        } catch (enqueueErr) {
          console.error('failed to enqueue pending charge', {
            callId,
            error: (enqueueErr as Error).message
          })
        }
      }
    }

    if (apiKeyId && !rejection) {
      await apiKeyService.recordUsage(apiKeyId, tracked.ip)
    }
  } catch (error) {
    console.error('failed to record api call stats from plugin', {
      pathname: tracked.pathname,
      method: tracked.method,
      statusCode,
      error
    })
  } finally {
    if (quotaReservation && (!willCharge || !hasCallRecord)) {
      await apiKeyService.releaseReservedCredits(quotaReservation.apiKeyId, quotaReservation.amount).catch((err) => {
        console.error('failed to release apiKey quota reservation', {
          apiKeyId: quotaReservation?.apiKeyId,
          amount: quotaReservation?.amount,
          error: (err as Error).message
        })
      })
    }
  }
}

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('afterResponse', (event: H3Event) => {
    const tracked = event.context.apiStatsTracked
    if (!tracked) {
      return
    }
    return recordCall(event, tracked)
  })
})
