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
import { apiCallService } from '~~/server/service/apiCallService'
import { apiKeyService } from '~~/server/service/apiKeyService'
import { creditService } from '~~/server/service/creditService'
import { pendingChargeService } from '~~/server/service/pendingChargeService'
import { shouldCharge } from '~~/server/utils/apiCallOutcome'
import { isGuardedPath } from '~~/shared/config/apiGuard'

interface ApiStatsTracked {
  startedAt: number
  pathname: string
  method: string
  ip: string | null
  requestSize: number | null
  userAgent: string | null
  referer: string | null
  queryString: string | null
}

declare module 'h3' {
  interface H3EventContext {
    apiStatsTracked?: ApiStatsTracked
  }
}

function normalizePathname(pathname: string) {
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1)
  }
  return pathname
}

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
  const statusCode = Math.trunc(event.node.res.statusCode || 200)
  const responseSize = parseOptionalInt(
    event.node.res.getHeader('content-length') as string | string[] | number | undefined
  )
  const latencyMs = Math.max(Date.now() - tracked.startedAt, 0)

  try {
    const target = event.context.apiStatsTarget
      ? { apiId: event.context.apiStatsTarget.apiId, apiPath: event.context.apiStatsTarget.apiPath }
      : null
    if (!target) {
      return
    }

    const rejection = event.context.apiGateRejection ?? null

    if (rejection && (
      rejection.outcome === 'invalid_api_key'
      || rejection.outcome === 'missing_api_key'
    )) {
      return
    }

    const skipDailyStat = rejection?.outcome === 'api_key_quota_exceeded'

    const apiKeyId = event.context.apiKey?.id
      ?? rejection?.apiKeyId
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
      userId: apiKeyUserId,
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
      statusCodeForStats: statStatusCode
    }
    const callId = skipDailyStat
      ? (await apiCallService.addCall(callInput))[0]?.id ?? null
      : await apiCallService.addCallAndUpsertDailyStat(callInput)

    if (willCharge && billing && billing.apiKeyUserId && callId) {
      const remark = `API 调用扣费 · ${target.apiPath}`
      try {
        const r = await creditService.charge({
          userId: billing.apiKeyUserId,
          amount: billing.costCredits,
          apiId: target.apiId,
          apiCallId: callId,
          remark
        })
        if (r.charged > 0) {
          await apiCallService.patchCreditsCost(callId, r.charged)
          if (apiKeyId) {
            apiKeyService.addUsedCredits(apiKeyId, r.charged).catch((err) => {
              console.error('failed to accumulate apiKey usedCredits', {
                apiKeyId,
                amount: r.charged,
                error: (err as Error).message
              })
            })
          }
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
  }
}

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('request', (event) => {
    const requestUrl = getRequestURL(event)
    const pathname = normalizePathname(requestUrl.pathname)
    if (!isGuardedPath(pathname)) {
      return
    }

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

  nitroApp.hooks.hook('afterResponse', (event) => {
    const tracked = event.context.apiStatsTracked
    if (!tracked) {
      return
    }
    void recordCall(event, tracked)
  })
})
