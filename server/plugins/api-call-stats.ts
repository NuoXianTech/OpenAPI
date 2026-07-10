/**
 * API call statistics Nitro plugin.
 *
 * The plugin only records calls that the API gate has resolved to a registered
 * statistics target. This keeps the logging rules aligned with docs:
 * unknown routes, unregistered APIs, and APIs with isStatistics=false do not
 * create api_calls or api_call_stats rows.
 */

import type { H3Event } from 'h3'
import { getHeader, getRequestIP, getRequestURL } from 'h3'
import { apiCallService } from '~~/server/services/api-call-service'
import { apiKeyService } from '~~/server/services/api-key-service'
import { creditService } from '~~/server/services/credit-service'
import { pendingChargeService } from '~~/server/services/pending-charge-service'
import { shouldCharge } from '~~/server/utils/api-call-outcome'
import { ensureRequestId } from '~~/server/utils/request-id'
import { isGuardedPath, normalizePathname } from '~~/server/config/api-guard'
import type { ApiStatsTracked } from '~~/server/types/api-guard'

// 调用日志写入规则：
//   - DO_NOT_WRITE_LOG_OUTCOMES：完全不写 apiCalls 行
//     · invalid_api_key / missing_api_key：API 密钥无效
//     · disabled：公共接口被禁用（接口禁用时直接关闭所有调用日志/统计）
//   - NON_COUNTED_REJECTION_OUTCOMES：写 apiCalls 但 isCounted=false（不参与统计聚合）
//     · disabled_api_key：API 密钥被禁用（isActive=false 或 revokedAt 已设）
//     · expired_api_key：API 密钥到期
//     · api_key_quota_exceeded：密钥配额上限
//     · insufficient_credits：积分不足
const DO_NOT_WRITE_LOG_OUTCOMES = new Set([
  'disabled',
  'invalid_api_key',
  'missing_api_key'
])

const NON_COUNTED_REJECTION_OUTCOMES = new Set([
  'api_key_quota_exceeded',
  'disabled_api_key',
  'expired_api_key',
  'insufficient_credits'
])

function parseOptionalInt(value: string | string[] | number | null | undefined) {
  const normalized = Array.isArray(value) ? value[0] : value
  if (normalized === null || normalized === undefined || normalized === '') {
    return null
  }

  const parsed = Number(normalized)
  if (!Number.isFinite(parsed)) {
    return null
  }

  const intValue = Math.trunc(parsed)
  return intValue >= 0 ? intValue : null
}

async function recordCall(event: H3Event, tracked: ApiStatsTracked) {
  const response = event.node?.res
  const statusCode = Math.trunc(response?.statusCode || 200)
  const responseSize = parseOptionalInt(
    response?.getHeader('content-length') as string | string[] | number | undefined
  )
  const latencyMs = Math.max(Date.now() - tracked.startedAt, 0)
  let quotaReservation: { apiKeyId: number, amount: number } | null = null
  let shouldReleaseQuotaReservation = false

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

    const willCharge = billing
      ? shouldCharge({
          costCredits: billing.costCredits,
          apiKeyUserId: billing.apiKeyUserId,
          forcedOutcome: billing.forcedOutcome,
          statusCode
        })
      : false
    quotaReservation = billing?.apiKeyQuotaReservation ?? null
    shouldReleaseQuotaReservation = Boolean(quotaReservation) && !willCharge

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
    if (shouldReleaseQuotaReservation && quotaReservation) {
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
  nitroApp.hooks.hook('request', (event: H3Event) => {
    const requestUrl = getRequestURL(event)
    const pathname = normalizePathname(requestUrl.pathname)
    if (!isGuardedPath(pathname)) {
      return
    }

    ensureRequestId(event)

    event.context.apiStatsTracked = {
      startedAt: Date.now(),
      pathname,
      method: (event.method || 'GET').toUpperCase(),
      ip: getRequestIP(event) || null,
      requestSize: parseOptionalInt(getHeader(event, 'content-length')),
      userAgent: (getHeader(event, 'user-agent') || null)?.slice(0, 500) || null,
      referer: (getHeader(event, 'referer') || getHeader(event, 'referrer') || null)?.slice(0, 1000) || null,
      queryString: requestUrl.search ? requestUrl.search.slice(1, 2001) : null
    }
  })

  nitroApp.hooks.hook('afterResponse', (event: H3Event) => {
    const tracked = event.context.apiStatsTracked
    if (!tracked) {
      return
    }
    return recordCall(event, tracked)
  })
})
