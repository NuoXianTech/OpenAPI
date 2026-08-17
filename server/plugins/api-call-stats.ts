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
import { shouldChargeGatewayCall } from '~~/server/utils/gateway-billing'
import type { ApiStatsTracked } from '~~/server/types/api-access'
import { getAppEventContext } from '~~/server/utils/event-context'
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
  'credits_unavailable',
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

export async function recordApiCall(event: H3Event, tracked: ApiStatsTracked) {
  const eventContext = getAppEventContext(event)
  const response = event.node?.res
  const statusCode = Math.trunc(response?.statusCode || 200)
  const responseSize = tracked.responseSize ?? toNullableNonNegativeInteger(
    response?.getHeader('content-length') as string | string[] | number | undefined
  )
  const latencyMs = Math.max(Date.now() - tracked.startedAt, 0)
  const billingContext = eventContext.apiBilling
  const creditReservation = billingContext?.creditReservation ?? null
  const willCharge = billingContext
    ? shouldChargeGatewayCall({
        costCredits: billingContext.costCredits,
        apiKeyUserId: billingContext.apiKeyUserId,
        statusCode
      })
    : false

  try {
    const target = eventContext.apiStatsTarget
      ? eventContext.apiStatsTarget
      : null
    if (!target) {
      return
    }

    const rejection = eventContext.apiGateRejection ?? null

    if (rejection && DO_NOT_WRITE_LOG_OUTCOMES.has(rejection.outcome)) {
      return
    }

    const ignoredStatus = tracked.ignoredStatisticsStatusCodes?.includes(statusCode) ?? false
    const isCounted = !ignoredStatus
      && (!rejection || !NON_COUNTED_REJECTION_OUTCOMES.has(rejection.outcome))

    const apiKeyId = eventContext.apiKey?.id
      ?? rejection?.apiKeyId
      ?? null
    const apiKeyName = eventContext.apiKey?.name
      ?? rejection?.apiKeyName
      ?? null
    const apiKeyUserId = eventContext.apiKey?.userId
      ?? rejection?.apiKeyUserId
      ?? null
    const billing = eventContext.apiBilling

    const failure = eventContext.apiFailure ?? null
    const errorCode = rejection?.errorCode ?? failure?.errorCode ?? null
    const errorMessage = rejection?.errorMessage ?? failure?.errorMessage ?? null

    const callInput = {
      routeId: target.routeId,
      routeName: target.routeName,
      upstreamTargetId: target.upstreamTargetId,
      upstreamTargetUrl: target.upstreamTargetUrl,
      apiKeyId,
      apiKeyName,
      userId: apiKeyUserId,
      requestId: eventContext.requestId ?? null,
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
      statusCodeForStats: statusCode
    }
    const callId = !isCounted
      ? (await apiCallService.addCall(callInput))[0]?.id ?? null
      : await apiCallService.addCallAndUpsertDailyStat(callInput)

    if (willCharge && billing && billing.apiKeyUserId && billing.creditReservation && callId) {
      const remark = `API 调用扣费 · ${target.apiPath}`
      try {
        await creditService.linkApiCall(billing.creditReservation.id, callId)
        await creditService.finalizeReservation({
          reservationId: billing.creditReservation.id,
          apiCallId: callId,
          remark
        })
      } catch (err) {
        console.error('failed to finalize billing reservation; background retry will continue', {
          callId,
          reservationId: billing.creditReservation.id,
          userId: billing.apiKeyUserId,
          amount: billing.costCredits,
          error: (err as Error).message || 'settlement failed'
        })
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
    if (creditReservation && !willCharge) {
      await creditService.releaseReservation(creditReservation.id, creditReservation.userId).catch((err) => {
        console.error('failed to release credit reservation', {
          reservationId: creditReservation.id,
          userId: creditReservation.userId,
          error: (err as Error).message
        })
      })
    }
  }
}

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('afterResponse', (event: H3Event) => {
    const tracked = getAppEventContext(event).apiStatsTracked
    if (!tracked) {
      return
    }
    return recordApiCall(event, tracked)
  })
})
