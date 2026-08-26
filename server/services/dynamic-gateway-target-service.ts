import {
  findGatewayExecutionError,
  GatewayExecutionError
} from '~~/server/errors/gateway-error'
import { limitGatewayUpstreamResponse } from '~~/server/services/dynamic-gateway-stream-service'
import type { ResolvedDynamicRoute } from '~~/server/services/routing-runtime-service'
import { safeFetch } from '~~/server/utils/safe-fetch'

const RETRYABLE_METHODS = new Set(['GET', 'HEAD'])
const RETRYABLE_UPSTREAM_STATUSES = new Set([502, 503, 504])

// A target that keeps failing is ejected for progressively longer, so a
// hard-down target stops receiving traffic instead of being retried on a
// fixed short cooldown that always expires before the next request.
const TARGET_EJECTION_BASE_MS = 15_000
const TARGET_EJECTION_MAX_MS = 5 * 60_000
const TARGET_EJECTION_THRESHOLD = 2

// Each attempt gets a slice of the route budget so a hung target cannot
// consume the whole timeout and starve failover. Only applied when more
// than one target is eligible.
const MIN_ATTEMPT_TIMEOUT_MS = 2_000

interface TargetHealth {
  failures: number
  ejectedUntil: number
}

const targetCounters = new Map<string, number>()
const targetHealth = new Map<string, TargetHealth>()

export type GatewayTarget = ResolvedDynamicRoute['upstream']['targets'][number]

function targetStateKey(
  match: ResolvedDynamicRoute,
  target: GatewayTarget
): string {
  return `${match.upstream.id}:${target.id}`
}

function availableTargets(match: ResolvedDynamicRoute): GatewayTarget[] {
  const targets = match.upstream.targets
  if (targets.length === 0) {
    throw new GatewayExecutionError(
      503,
      'UPSTREAM_NOT_CONFIGURED',
      '上游服务尚未配置'
    )
  }

  const now = Date.now()
  const available = targets.filter((target) => {
    const health = targetHealth.get(targetStateKey(match, target))
    return !health || health.ejectedUntil <= now
  })
  // Every target is ejected: fall back to the full list so a total outage
  // still produces a real upstream error rather than a config error.
  return available.length > 0 ? available : targets
}

export function orderedGatewayTargets(
  match: ResolvedDynamicRoute
): GatewayTarget[] {
  const targets = availableTargets(match)
  const counter = targetCounters.get(match.upstream.id) ?? 0
  targetCounters.set(
    match.upstream.id,
    (counter + 1) % Number.MAX_SAFE_INTEGER
  )
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
  const key = targetStateKey(match, target)
  const failures = (targetHealth.get(key)?.failures ?? 0) + 1
  const ejectedUntil = failures >= TARGET_EJECTION_THRESHOLD
    ? Date.now() + Math.min(
      TARGET_EJECTION_MAX_MS,
      TARGET_EJECTION_BASE_MS * 2 ** (failures - TARGET_EJECTION_THRESHOLD)
    )
    : 0
  targetHealth.set(key, { failures, ejectedUntil })
}

function markTargetResponsive(
  match: ResolvedDynamicRoute,
  target: GatewayTarget
): void {
  targetHealth.delete(targetStateKey(match, target))
}

export function resetGatewayTargetHealth(): void {
  targetHealth.clear()
  targetCounters.clear()
}

export function buildGatewayTargetUrl(
  baseUrl: string,
  upstreamPath: string,
  search: string
): URL {
  const target = new URL(baseUrl)
  const basePath = target.pathname === '/'
    ? ''
    : target.pathname.replace(/\/$/, '')
  target.pathname = `${basePath}${upstreamPath}` || '/'
  const query = new URLSearchParams(search)
  query.delete('apikey')
  target.search = query.toString()
  target.hash = ''
  return target
}

async function fetchTarget(
  match: ResolvedDynamicRoute,
  targetUrl: URL,
  init: RequestInit | undefined
): Promise<Response> {
  if (match.upstream.serviceManaged) return fetch(targetUrl, init)
  return safeFetch(targetUrl, {
    ...init,
    allowedHosts: [targetUrl.hostname],
    allowHttp: true,
    allowPrivateNetworks: true,
    allowNonDefaultPort: true
  })
}

function isServiceTokenRejection(response: Response): boolean {
  return response.status === 401
    && response.headers.get('x-openapi-error-code') === 'UNAUTHORIZED'
    && response.headers.get('www-authenticate')
      ?.trim()
      .toLowerCase()
      .startsWith('service ') === true
}

export function createGatewayProxyFetch(input: {
  match: ResolvedDynamicRoute
  targets: GatewayTarget[]
  upstreamPath: string
  search: string
  maximumResponseBytes: number
  onTarget: (target: GatewayTarget) => void
  onResponseBytes: (receivedBytes: number) => void
}): typeof fetch {
  return async (_request, init) => {
    const method = (init?.method ?? 'GET').toUpperCase()
    const mayRetry = RETRYABLE_METHODS.has(method)
    const targets = mayRetry ? input.targets : input.targets.slice(0, 1)
    const overallSignal = init?.signal ?? null
    const attemptTimeoutMs = targets.length > 1
      ? Math.max(
          MIN_ATTEMPT_TIMEOUT_MS,
          Math.floor(input.match.route.timeoutMs / targets.length)
        )
      : null
    let lastError: unknown = null
    let lastErrorWasAttemptTimeout = false

    for (let index = 0; index < targets.length; index += 1) {
      const target = targets[index]!
      const targetUrl = buildGatewayTargetUrl(
        target.baseUrl,
        input.upstreamPath,
        input.search
      )
      input.onTarget(target)
      // A per-attempt controller lets a hung target be abandoned without
      // aborting the shared signal, which would kill every later attempt.
      const attemptController = new AbortController()
      const abortAttempt = () => attemptController.abort(overallSignal?.reason)
      overallSignal?.addEventListener('abort', abortAttempt, { once: true })
      let attemptTimedOut = false
      const attemptTimer = attemptTimeoutMs === null
        ? null
        : setTimeout(() => {
            attemptTimedOut = true
            attemptController.abort(new Error('upstream attempt timeout'))
          }, attemptTimeoutMs)
      const releaseAttempt = () => {
        if (attemptTimer) clearTimeout(attemptTimer)
        overallSignal?.removeEventListener('abort', abortAttempt)
      }
      try {
        const response = await fetchTarget(input.match, targetUrl, {
          ...init,
          signal: attemptController.signal
        })
        // Headers arrived: stop the attempt clock so it cannot abort the
        // response body mid-stream. The overall-signal listener stays so a
        // route timeout or client disconnect still tears the body down.
        if (attemptTimer) clearTimeout(attemptTimer)
        const retryableStatus = RETRYABLE_UPSTREAM_STATUSES.has(response.status)
        if (retryableStatus) markTargetUnavailable(input.match, target)
        else markTargetResponsive(input.match, target)

        if (
          input.match.upstream.serviceManaged
          && isServiceTokenRejection(response)
        ) {
          await response.body?.cancel().catch(() => undefined)
          throw new GatewayExecutionError(
            502,
            'UPSTREAM_AUTH_FAILED',
            '上游服务认证失败'
          )
        }

        if (retryableStatus && index < targets.length - 1) {
          releaseAttempt()
          await response.body?.cancel().catch(() => undefined)
          continue
        }
        return limitGatewayUpstreamResponse(
          response,
          input.maximumResponseBytes,
          input.onResponseBytes
        )
      } catch (error) {
        releaseAttempt()
        if (findGatewayExecutionError(error)) throw error
        // The client went away or the route budget expired: the target is
        // not at fault and no later attempt can succeed.
        if (overallSignal?.aborted) throw error
        markTargetUnavailable(input.match, target)
        lastError = error
        lastErrorWasAttemptTimeout = attemptTimedOut
        if (!mayRetry || index === targets.length - 1) break
      }
    }
    if (lastErrorWasAttemptTimeout) {
      throw new GatewayExecutionError(
        504,
        'UPSTREAM_TIMEOUT',
        '上游服务响应超时'
      )
    }
    throw lastError ?? new Error('upstream target selection failed')
  }
}
