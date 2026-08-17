import type { H3Event } from 'h3'
import { getHeader, getRequestURL } from 'h3'
import type { ResolvedDynamicRoute } from '~~/server/services/routing-runtime-service'
import { creditService } from '~~/server/services/credit-service'
import { shouldChargeGatewayCall } from '~~/server/utils/gateway-billing'
import { getAppEventContext } from '~~/server/utils/event-context'
import { toNullableNonNegativeInteger } from '~~/server/utils/number'
import { ensureRequestId } from '~~/server/utils/request-id'
import { readRequestMeta } from '~~/server/utils/request-meta'
import {
  sanitizeQueryStringForLog,
  sanitizeUrlForLog
} from '~~/server/utils/request-query'

export function initializeGatewayStatistics(
  event: H3Event,
  match: ResolvedDynamicRoute
): void {
  if (!match.route.isStatistics) return
  const requestUrl = getRequestURL(event)
  const requestMeta = readRequestMeta(event)
  const context = getAppEventContext(event)
  ensureRequestId(event)
  context.apiStatsTarget = {
    routeId: match.route.id,
    routeName: match.route.name,
    apiPath: match.route.pathPattern,
    upstreamTargetId: null,
    upstreamTargetUrl: null
  }
  context.apiStatsTracked = {
    startedAt: Date.now(),
    pathname: requestUrl.pathname,
    method: event.method.toUpperCase(),
    ip: requestMeta.ip,
    requestSize: toNullableNonNegativeInteger(getHeader(event, 'content-length')),
    userAgent: requestMeta.userAgent?.slice(0, 500) || null,
    referer: sanitizeUrlForLog(
      getHeader(event, 'referer') || getHeader(event, 'referrer'),
      1_000,
      match.route.sensitiveQueryParameters
    ),
    queryString: sanitizeQueryStringForLog(
      requestUrl.search,
      2_000,
      match.route.sensitiveQueryParameters
    )
  }
}

export async function persistGatewayBillingOutcome(
  event: H3Event,
  statusCode: number
): Promise<void> {
  const billing = getAppEventContext(event).apiBilling
  const reservation = billing?.creditReservation
  if (!billing || !reservation) return
  const charge = shouldChargeGatewayCall({
    costCredits: billing.costCredits,
    apiKeyUserId: billing.apiKeyUserId,
    statusCode
  })
  if (!charge) {
    await creditService.releaseReservation(reservation.id, reservation.userId)
    billing.creditReservation = null
    return
  }
  const marked = await creditService.markReservationPending(
    reservation.id,
    reservation.userId
  )
  if (!marked) throw new Error('Billing reservation is no longer active')
}

export async function releaseGatewayBillingReservation(
  event: H3Event
): Promise<void> {
  const billing = getAppEventContext(event).apiBilling
  const reservation = billing?.creditReservation
  if (!billing || !reservation) return
  const released = await creditService.releaseReservation(
    reservation.id,
    reservation.userId
  )
  if (!released) throw new Error('Billing reservation could not be released')
  billing.creditReservation = null
}
