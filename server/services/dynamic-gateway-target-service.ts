import {
  findGatewayExecutionError,
  GatewayExecutionError
} from '~~/server/errors/gateway-error'
import { limitGatewayUpstreamResponse } from '~~/server/services/dynamic-gateway-stream-service'
import type { ResolvedDynamicRoute } from '~~/server/services/routing-runtime-service'
import { safeFetch } from '~~/server/utils/safe-fetch'

const RETRYABLE_METHODS = new Set(['GET', 'HEAD'])
const RETRYABLE_UPSTREAM_STATUSES = new Set([502, 503, 504])
const TARGET_COOLDOWN_MS = 15_000

const targetCounters = new Map<string, number>()
const targetCooldowns = new Map<string, number>()

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
    const key = targetStateKey(match, target)
    const retryAt = targetCooldowns.get(key)
    if (!retryAt) return true
    if (retryAt > now) return false
    targetCooldowns.delete(key)
    return true
  })
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
  if (match.upstream.kind === 'external') {
    return safeFetch(targetUrl, {
      ...init,
      allowedHosts: [targetUrl.hostname]
    })
  }
  return fetch(targetUrl, init)
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
    let lastError: unknown = null

    for (let index = 0; index < targets.length; index += 1) {
      const target = targets[index]!
      const targetUrl = buildGatewayTargetUrl(
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
        return limitGatewayUpstreamResponse(
          response,
          input.maximumResponseBytes,
          input.onResponseBytes
        )
      } catch (error) {
        if (findGatewayExecutionError(error)) throw error
        markTargetUnavailable(input.match, target)
        lastError = error
        if (!mayRetry || index === targets.length - 1) throw error
      }
    }
    throw lastError ?? new Error('upstream target selection failed')
  }
}
