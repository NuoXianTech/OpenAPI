import type { H3Event } from 'h3'
import {
  getHeader,
  getProxyRequestHeaders,
  getRequestProtocol,
  getRequestURL,
  getRequestWebStream,
  sendNoContent,
  sendProxy,
  setResponseHeader
} from 'h3'
import { dynamicGatewayAccessService } from '~~/server/services/dynamic-gateway-access-service'
import { routingRuntimeService, type ResolvedDynamicRoute } from '~~/server/services/routing-runtime-service'
import { creditService } from '~~/server/services/credit-service'
import { shouldChargeGatewayCall } from '~~/server/utils/gateway-billing'
import { getAppEventContext } from '~~/server/utils/event-context'
import { gatewayFail } from '~~/server/utils/gateway-response'
import { setPublicApiCors } from '~~/server/utils/public-api-cors'
import { ensureRequestId } from '~~/server/utils/request-id'
import { readClientIp, readRequestMeta } from '~~/server/utils/request-meta'
import { sanitizeQueryStringForLog } from '~~/server/utils/request-query'
import { toNullableNonNegativeInteger } from '~~/server/utils/number'
import { renderUpstreamPath } from '~~/server/utils/route-pattern'
import { safeFetch } from '~~/server/utils/safe-fetch'
import { upstreamServiceTokenService } from '~~/server/services/upstream-service-token-service'

const PAYLOAD_METHODS = new Set(['PATCH', 'POST', 'PUT', 'DELETE'])
const STRIPPED_REQUEST_HEADERS = new Set([
  'authorization',
  'cookie',
  'x-api-key',
  'api-key',
  'x-auth-token',
  'proxy-authorization'
])

interface DynamicGatewayResult {
  matched: boolean
  response?: unknown
}

class BillingPersistenceError extends Error {
  constructor(cause: unknown) {
    super('billing outcome could not be persisted', { cause })
    this.name = 'BillingPersistenceError'
  }
}

class GatewayExecutionError extends Error {
  readonly status: number
  readonly code: string
  readonly publicMessage: string

  constructor(status: number, code: string, publicMessage: string) {
    super(publicMessage)
    this.name = 'GatewayExecutionError'
    this.status = status
    this.code = code
    this.publicMessage = publicMessage
  }
}

const UPSTREAM_ERROR_CODE_PATTERN = /^[A-Z][A-Z0-9_]{0,79}$/

const targetCounters = new Map<string, number>()

function selectTarget(match: ResolvedDynamicRoute) {
  const targets = match.upstream.targets
  if (targets.length === 0) {
    throw new GatewayExecutionError(503, 'UPSTREAM_NOT_CONFIGURED', '上游服务尚未配置')
  }

  const counter = targetCounters.get(match.upstream.id) ?? 0
  targetCounters.set(match.upstream.id, (counter + 1) % Number.MAX_SAFE_INTEGER)
  if (match.upstream.loadBalancing !== 'weighted') return targets[counter % targets.length]!

  const totalWeight = targets.reduce((sum, target) => sum + Math.max(1, target.weight), 0)
  let selectedWeight = counter % totalWeight
  for (const target of targets) {
    selectedWeight -= Math.max(1, target.weight)
    if (selectedWeight < 0) return target
  }
  return targets[0]!
}

function buildTargetUrl(baseUrl: string, upstreamPath: string, search: string): URL {
  const target = new URL(baseUrl)
  const basePath = target.pathname === '/' ? '' : target.pathname.replace(/\/$/, '')
  target.pathname = `${basePath}${upstreamPath}` || '/'
  const query = new URLSearchParams(search)
  query.delete('apikey')
  target.search = query.toString()
  target.hash = ''
  return target
}

function createUpstreamHeaders(event: H3Event, match: ResolvedDynamicRoute, serviceToken: string): Headers {
  const headers = new Headers(getProxyRequestHeaders(event))
  for (const name of Array.from(headers.keys())) {
    const normalized = name.toLowerCase()
    if (STRIPPED_REQUEST_HEADERS.has(normalized) || normalized.startsWith('x-openapi-')) {
      headers.delete(name)
    }
  }

  const requestUrl = getRequestURL(event)
  const clientIp = readClientIp(event)
  headers.set('x-request-id', ensureRequestId(event))
  headers.set('x-forwarded-proto', getRequestProtocol(event))
  headers.set('x-forwarded-host', requestUrl.host)
  if (clientIp) headers.set('x-forwarded-for', clientIp)
  else headers.delete('x-forwarded-for')
  headers.set('x-openapi-route-id', match.route.id)
  headers.set('x-openapi-upstream-id', match.upstream.id)
  headers.set('x-openapi-environment-id', match.environmentId)
  headers.set('x-openapi-revision-id', match.revisionId)
  headers.set('x-openapi-product-id', match.route.productId)
  headers.set('x-openapi-product-slug', match.route.productSlug)
  headers.set('x-openapi-api-version', match.route.version)

  if (match.upstream.kind === 'internal') {
    if (!serviceToken) {
      throw new GatewayExecutionError(503, 'UPSTREAM_AUTH_UNAVAILABLE', '上游服务凭证尚未配置')
    }
    headers.set('authorization', `Service ${serviceToken}`)
  }
  return headers
}

function initializeStatistics(event: H3Event, match: ResolvedDynamicRoute): void {
  if (!match.route.isStatistics) return
  const requestUrl = getRequestURL(event)
  const requestMeta = readRequestMeta(event)
  const context = getAppEventContext(event)
  ensureRequestId(event)
  context.apiStatsTarget = {
    routeId: match.route.id,
    targetName: match.route.name,
    apiPath: match.route.pathPattern
  }
  context.apiStatsTracked = {
    startedAt: Date.now(),
    pathname: requestUrl.pathname,
    method: event.method.toUpperCase(),
    ip: requestMeta.ip,
    requestSize: toNullableNonNegativeInteger(getHeader(event, 'content-length')),
    userAgent: requestMeta.userAgent?.slice(0, 500) || null,
    referer: (getHeader(event, 'referer') || getHeader(event, 'referrer') || null)?.slice(0, 1000) || null,
    queryString: sanitizeQueryStringForLog(requestUrl.search)
  }
}

async function persistBillingOutcome(event: H3Event, statusCode: number): Promise<void> {
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
  const marked = await creditService.markReservationPending(reservation.id, reservation.userId)
  if (!marked) throw new Error('Billing reservation is no longer active')
}

function assertRequestSize(event: H3Event, maximumBytes: number): void {
  if (maximumBytes === 0 && PAYLOAD_METHODS.has(event.method)) {
    throw new GatewayExecutionError(413, 'REQUEST_BODY_NOT_ALLOWED', '此接口不接受请求体')
  }
  const contentLength = Number(event.node.req.headers['content-length'])
  if (Number.isFinite(contentLength) && contentLength > maximumBytes) {
    throw new GatewayExecutionError(413, 'REQUEST_BODY_TOO_LARGE', '请求体超过接口限制')
  }
}

function captureUpstreamFailure(event: H3Event, response: Response): void {
  if (response.status < 400) return
  const errorCode = response.headers.get('x-openapi-error-code')?.trim() ?? ''
  if (!UPSTREAM_ERROR_CODE_PATTERN.test(errorCode)) return
  getAppEventContext(event).apiFailure = {
    errorCode,
    errorMessage: null
  }
}

export const dynamicGatewayService = {
  async tryHandle(event: H3Event): Promise<DynamicGatewayResult> {
    const requestUrl = getRequestURL(event)
    if (event.method.toUpperCase() === 'OPTIONS') {
      const allowedMethods = await routingRuntimeService.resolveAllowedMethods(
        requestUrl.pathname,
        requestUrl.hostname
      )
      if (allowedMethods.length === 0) return { matched: false }
      setPublicApiCors(event, allowedMethods)
      return { matched: true, response: sendNoContent(event) }
    }

    const match = await routingRuntimeService.resolve(event.method, requestUrl.pathname, requestUrl.hostname)
    if (!match) {
      const allowedMethods = await routingRuntimeService.resolveAllowedMethods(
        requestUrl.pathname,
        requestUrl.hostname
      )
      if (allowedMethods.length === 0) return { matched: false }
      setPublicApiCors(event, allowedMethods)
      setResponseHeader(event, 'allow', allowedMethods.join(', '))
      return {
        matched: true,
        response: gatewayFail(event, 405, 'METHOD_NOT_ALLOWED', '请求方法不受支持')
      }
    }

    setPublicApiCors(event, [match.route.method])
    initializeStatistics(event, match)
    let abortController: AbortController | null = null
    let abortRequest: (() => void) | null = null
    let timeout: ReturnType<typeof setTimeout> | null = null
    let targetId: string | null = null
    let proxyStarted = false

    try {
      assertRequestSize(event, match.route.maxRequestBytes)
      const access = await dynamicGatewayAccessService.authorize(event, match)
      if (!access.passed) return { matched: true, response: access.response }

      const serviceToken = match.upstream.kind === 'internal'
        ? await upstreamServiceTokenService.get(match.upstream.id)
        : ''
      const target = selectTarget(match)
      targetId = target.id
      const upstreamPath = renderUpstreamPath(match.route.upstreamPathTemplate, match.params)
      const targetUrl = buildTargetUrl(target.baseUrl, upstreamPath, requestUrl.search)
      const headers = createUpstreamHeaders(event, match, serviceToken)
      abortController = new AbortController()
      timeout = setTimeout(
        () => abortController?.abort(new Error('upstream timeout')),
        match.route.timeoutMs
      )
      abortRequest = () => abortController?.abort(new Error('client disconnected'))
      event.node.req.once('aborted', abortRequest)

      const body = PAYLOAD_METHODS.has(event.method) ? getRequestWebStream(event) : undefined
      const proxyFetch = match.upstream.kind === 'external'
        ? (input: RequestInfo | URL, init?: RequestInit) => safeFetch(input instanceof Request ? input.url : input, {
            ...init,
            allowedHosts: [targetUrl.hostname]
          })
        : undefined
      let upstreamStatus = 502
      proxyStarted = true
      const response = await sendProxy(event, targetUrl.toString(), {
        fetch: proxyFetch,
        sendStream: true,
        onResponse: async (_proxyEvent, upstreamResponse) => {
          upstreamStatus = upstreamResponse.status
          if (match.upstream.kind === 'internal') {
            captureUpstreamFailure(event, upstreamResponse)
          }
          const contentLength = Number(upstreamResponse.headers.get('content-length'))
          if (
            Number.isFinite(contentLength)
            && match.route.maxResponseBytes >= 0
            && contentLength > match.route.maxResponseBytes
          ) {
            throw new GatewayExecutionError(
              502,
              'UPSTREAM_RESPONSE_TOO_LARGE',
              '上游响应超过接口限制'
            )
          }
          try {
            await persistBillingOutcome(event, upstreamStatus)
          } catch (error) {
            throw new BillingPersistenceError(error)
          }
        },
        fetchOptions: {
          method: event.method,
          headers,
          body,
          duplex: body ? 'half' : undefined,
          redirect: match.upstream.kind === 'internal' ? 'follow' : 'manual',
          signal: abortController.signal
        }
      })
      return { matched: true, response }
    } catch (error) {
      if (abortController?.signal.aborted) {
        return {
          matched: true,
          response: gatewayFail(event, 504, 'UPSTREAM_TIMEOUT', '上游服务响应超时')
        }
      }
      if (error instanceof BillingPersistenceError) {
        console.error('[gateway] failed to persist billing outcome', {
          routeId: match.route.id,
          error: error.cause instanceof Error ? error.cause.message : String(error.cause)
        })
        return {
          matched: true,
          response: gatewayFail(event, 503, 'BILLING_UNAVAILABLE', '计费服务暂不可用，请稍后再试')
        }
      }
      if (error instanceof GatewayExecutionError) {
        return {
          matched: true,
          response: gatewayFail(event, error.status, error.code, error.publicMessage)
        }
      }
      console.error('[gateway] upstream request failed', {
        routeId: match.route.id,
        target: targetId,
        error: error instanceof Error ? error.message : String(error)
      })
      return {
        matched: true,
        response: proxyStarted
          ? gatewayFail(event, 502, 'UPSTREAM_UNAVAILABLE', '上游服务暂时不可用')
          : gatewayFail(event, 503, 'GATEWAY_UNAVAILABLE', '网关服务暂不可用，请稍后再试')
      }
    } finally {
      if (timeout) clearTimeout(timeout)
      if (abortRequest) event.node.req.off('aborted', abortRequest)
    }
  }
}
