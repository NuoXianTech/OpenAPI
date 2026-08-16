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
const RETRYABLE_METHODS = new Set(['GET', 'HEAD'])
const RETRYABLE_UPSTREAM_STATUSES = new Set([502, 503, 504])
const TARGET_COOLDOWN_MS = 15_000
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
const targetCooldowns = new Map<string, number>()
type GatewayTarget = ResolvedDynamicRoute['upstream']['targets'][number]

function targetStateKey(match: ResolvedDynamicRoute, target: GatewayTarget): string {
  return `${match.upstream.id}:${target.id}`
}

function availableTargets(match: ResolvedDynamicRoute): GatewayTarget[] {
  const targets = match.upstream.targets
  if (targets.length === 0) {
    throw new GatewayExecutionError(503, 'UPSTREAM_NOT_CONFIGURED', '上游服务尚未配置')
  }

  const now = Date.now()
  const available = targets.filter((target) => {
    const key = targetStateKey(match, target)
    const retryAt = targetCooldowns.get(key)
    if (!retryAt) return true
    if (retryAt > now) return false
    targetCooldowns.delete(key)
    return true
  })
  return available.length > 0 ? available : targets
}

function orderedTargets(match: ResolvedDynamicRoute): GatewayTarget[] {
  const targets = availableTargets(match)

  const counter = targetCounters.get(match.upstream.id) ?? 0
  targetCounters.set(match.upstream.id, (counter + 1) % Number.MAX_SAFE_INTEGER)
  let selectedIndex = counter % targets.length
  if (match.upstream.loadBalancing === 'weighted') {
    const totalWeight = targets.reduce(
      (sum, target) => sum + Math.max(1, target.weight),
      0
    )
    let selectedWeight = counter % totalWeight
    for (let index = 0; index < targets.length; index += 1) {
      selectedWeight -= Math.max(1, targets[index]!.weight)
      if (selectedWeight < 0) {
        selectedIndex = index
        break
      }
    }
  }
  return [
    ...targets.slice(selectedIndex),
    ...targets.slice(0, selectedIndex)
  ]
}

function markTargetUnavailable(
  match: ResolvedDynamicRoute,
  target: GatewayTarget
): void {
  targetCooldowns.set(
    targetStateKey(match, target),
    Date.now() + TARGET_COOLDOWN_MS
  )
}

function markTargetResponsive(
  match: ResolvedDynamicRoute,
  target: GatewayTarget
): void {
  targetCooldowns.delete(targetStateKey(match, target))
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

async function releaseBillingReservation(event: H3Event): Promise<void> {
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

function contentLength(value: string | string[] | null | undefined): number | null {
  const normalized = Array.isArray(value) ? value[0] : value
  if (!normalized || !/^\d+$/.test(normalized)) return null
  const parsed = Number(normalized)
  return Number.isSafeInteger(parsed) ? parsed : null
}

function assertRequestSize(event: H3Event, maximumBytes: number): void {
  if (maximumBytes === 0 && PAYLOAD_METHODS.has(event.method.toUpperCase())) {
    throw new GatewayExecutionError(413, 'REQUEST_BODY_NOT_ALLOWED', '此接口不接受请求体')
  }
  const declaredLength = contentLength(event.node.req.headers['content-length'])
  if (declaredLength !== null && declaredLength > maximumBytes) {
    throw new GatewayExecutionError(413, 'REQUEST_BODY_TOO_LARGE', '请求体超过接口限制')
  }
}

function limitByteStream(
  stream: ReadableStream<Uint8Array>,
  maximumBytes: number,
  error: () => GatewayExecutionError
): ReadableStream<Uint8Array> {
  let receivedBytes = 0
  return stream.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      receivedBytes += chunk.byteLength
      if (receivedBytes > maximumBytes) throw error()
      controller.enqueue(chunk)
    }
  }))
}

function requestBody(
  event: H3Event,
  maximumBytes: number
): ReadableStream<Uint8Array> | undefined {
  if (!PAYLOAD_METHODS.has(event.method.toUpperCase())) return undefined
  const stream = getRequestWebStream(event)
  if (!stream) return undefined
  return limitByteStream(
    stream,
    maximumBytes,
    () => new GatewayExecutionError(
      413,
      'REQUEST_BODY_TOO_LARGE',
      '请求体超过接口限制'
    )
  )
}

async function limitedUpstreamResponse(
  response: Response,
  maximumBytes: number
): Promise<Response> {
  const declaredLength = contentLength(response.headers.get('content-length'))
  if (declaredLength !== null && declaredLength > maximumBytes) {
    await response.body?.cancel().catch(() => undefined)
    throw new GatewayExecutionError(
      502,
      'UPSTREAM_RESPONSE_TOO_LARGE',
      '上游响应超过接口限制'
    )
  }
  if (!response.body) return response
  return new Response(
    limitByteStream(
      response.body,
      maximumBytes,
      () => new GatewayExecutionError(
        502,
        'UPSTREAM_RESPONSE_TOO_LARGE',
        '上游响应超过接口限制'
      )
    ),
    {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    }
  )
}

function wrappedError<TError extends Error>(
  error: unknown,
  match: (value: unknown) => value is TError
): TError | null {
  const seen = new Set<unknown>()
  let current: unknown = error
  while (current && !seen.has(current)) {
    if (match(current)) return current
    seen.add(current)
    if (typeof current !== 'object' || !('cause' in current)) return null
    current = current.cause
  }
  return null
}

function gatewayExecutionError(error: unknown): GatewayExecutionError | null {
  return wrappedError(
    error,
    (value): value is GatewayExecutionError => value instanceof GatewayExecutionError
  )
}

function billingPersistenceError(error: unknown): BillingPersistenceError | null {
  return wrappedError(
    error,
    (value): value is BillingPersistenceError => value instanceof BillingPersistenceError
  )
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

async function fetchTarget(
  match: ResolvedDynamicRoute,
  targetUrl: URL,
  init: RequestInit | undefined
): Promise<Response> {
  if (match.upstream.kind === 'external') {
    return safeFetch(targetUrl, {
      ...init,
      allowedHosts: [targetUrl.hostname]
    })
  }
  return fetch(targetUrl, init)
}

function createProxyFetch(input: {
  match: ResolvedDynamicRoute
  targets: GatewayTarget[]
  upstreamPath: string
  search: string
  maximumResponseBytes: number
  onTarget: (target: GatewayTarget) => void
}): typeof fetch {
  return async (_request, init) => {
    const method = (init?.method ?? 'GET').toUpperCase()
    const mayRetry = RETRYABLE_METHODS.has(method)
    const targets = mayRetry ? input.targets : input.targets.slice(0, 1)
    let lastError: unknown = null

    for (let index = 0; index < targets.length; index += 1) {
      const target = targets[index]!
      const targetUrl = buildTargetUrl(
        target.baseUrl,
        input.upstreamPath,
        input.search
      )
      input.onTarget(target)
      try {
        const response = await fetchTarget(input.match, targetUrl, init)
        const retryableStatus = RETRYABLE_UPSTREAM_STATUSES.has(response.status)
        if (retryableStatus) markTargetUnavailable(input.match, target)
        else markTargetResponsive(input.match, target)

        if (retryableStatus && index < targets.length - 1) {
          await response.body?.cancel().catch(() => undefined)
          continue
        }
        return limitedUpstreamResponse(
          response,
          input.maximumResponseBytes
        )
      } catch (error) {
        if (gatewayExecutionError(error)) throw error
        markTargetUnavailable(input.match, target)
        lastError = error
        if (!mayRetry || index === targets.length - 1) throw error
      }
    }
    throw lastError ?? new Error('upstream target selection failed')
  }
}

function gatewayFailureResult(
  event: H3Event,
  status: number,
  code: string,
  message: string,
  error: unknown
): DynamicGatewayResult {
  if (!event.node.res.headersSent) {
    return {
      matched: true,
      response: gatewayFail(event, status, code, message)
    }
  }
  getAppEventContext(event).apiFailure = {
    errorCode: code,
    errorMessage: message
  }
  event.node.res.statusCode = status
  event.node.res.destroy(error instanceof Error ? error : undefined)
  return { matched: true }
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
      const targets = orderedTargets(match)
      const target = targets[0]!
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

      const body = requestBody(event, match.route.maxRequestBytes)
      const proxyFetch = createProxyFetch({
        match,
        targets,
        upstreamPath,
        search: requestUrl.search,
        maximumResponseBytes: match.route.maxResponseBytes,
        onTarget: (selected) => {
          targetId = selected.id
        }
      })
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
          redirect: 'manual',
          signal: abortController.signal
        }
      })
      return { matched: true, response }
    } catch (caughtError) {
      let error = caughtError
      try {
        await releaseBillingReservation(event)
      } catch (releaseError) {
        error = new BillingPersistenceError(releaseError)
      }
      const billingError = billingPersistenceError(error)
      if (billingError) {
        console.error('[gateway] failed to persist billing outcome', {
          routeId: match.route.id,
          error: billingError.cause instanceof Error
            ? billingError.cause.message
            : String(billingError.cause)
        })
        return gatewayFailureResult(
          event,
          503,
          'BILLING_UNAVAILABLE',
          '计费服务暂不可用，请稍后再试',
          billingError
        )
      }
      if (abortController?.signal.aborted) {
        return gatewayFailureResult(
          event,
          504,
          'UPSTREAM_TIMEOUT',
          '上游服务响应超时',
          error
        )
      }
      const executionError = gatewayExecutionError(error)
      if (executionError) {
        return gatewayFailureResult(
          event,
          executionError.status,
          executionError.code,
          executionError.publicMessage,
          executionError
        )
      }
      console.error('[gateway] upstream request failed', {
        routeId: match.route.id,
        target: targetId,
        error: error instanceof Error ? error.message : String(error)
      })
      return proxyStarted
        ? gatewayFailureResult(
            event,
            502,
            'UPSTREAM_UNAVAILABLE',
            '上游服务暂时不可用',
            error
          )
        : gatewayFailureResult(
            event,
            503,
            'GATEWAY_UNAVAILABLE',
            '网关服务暂不可用，请稍后再试',
            error
          )
    } finally {
      if (timeout) clearTimeout(timeout)
      if (abortRequest) event.node.req.off('aborted', abortRequest)
    }
  }
}
