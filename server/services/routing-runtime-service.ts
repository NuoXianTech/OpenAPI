import { createHash } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { db } from '~~/server/db/client'
import { environments, routingRevisions } from '~~/server/db/schema'
import type {
  RoutingRevisionPayload,
  RoutingRevisionRoute,
  RoutingRevisionUpstream
} from '~~/server/types/routing-revision'
import { canonicalJson } from '~~/server/utils/canonical-json'
import {
  matchRoutePath,
  normalizeRouteHost,
  parseRoutePathPattern,
  routeHostMatches,
  type ParsedRoutePattern
} from '~~/server/utils/route-pattern'
import { findRoutingRouteConflict } from '~~/server/utils/routing-conflict'

const CACHE_TTL_MS = 1_000
const HTTP_METHOD_ORDER = ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'] as const

interface CompiledRoute {
  definition: RoutingRevisionRoute
  parsedPath: ParsedRoutePattern
  hosts: string[]
}

interface CompiledEnvironment {
  environmentId: string
  defaultDomain: string | null
  revisionId: string
  routes: CompiledRoute[]
  upstreams: Map<string, RoutingRevisionUpstream>
}

export interface ResolvedDynamicRoute {
  environmentId: string
  revisionId: string
  route: RoutingRevisionRoute
  upstream: RoutingRevisionUpstream
  params: Record<string, string>
}

interface RuntimeCache {
  generation: number
  expiresAt: number
  environments: CompiledEnvironment[]
}

let runtimeCache: RuntimeCache | null = null
let runtimeGeneration = 0

export function invalidateRoutingRuntimeCache(): void {
  runtimeGeneration += 1
}

function validateChecksum(payload: RoutingRevisionPayload, checksum: string): void {
  const actual = createHash('sha256').update(canonicalJson(payload)).digest('hex')
  if (actual !== checksum) throw new Error(`routing revision checksum mismatch: ${payload.revisionId}`)
}

function compileEnvironment(input: {
  environmentId: string
  defaultDomain: string | null
  revisionId: string
  checksum: string
  payload: RoutingRevisionPayload
}): CompiledEnvironment {
  const { payload } = input
  if (payload.schemaVersion !== 1) throw new Error(`unsupported routing schema: ${payload.schemaVersion}`)
  if (payload.revisionId !== input.revisionId || payload.environmentId !== input.environmentId) {
    throw new Error('routing revision identity mismatch')
  }
  validateChecksum(payload, input.checksum)

  const upstreams = new Map(payload.upstreams.map(upstream => [upstream.id, upstream]))
  const routes = payload.routes.map((route): CompiledRoute => {
    const parsedPath = parseRoutePathPattern(route.pathPattern)
    if (parsedPath.normalizedShape !== route.normalizedShape) {
      throw new Error(`route normalized shape mismatch: ${route.id}`)
    }
    if (!upstreams.has(route.upstreamServiceId)) {
      throw new Error(`route references missing upstream: ${route.id}`)
    }
    return {
      definition: route,
      parsedPath,
      hosts: route.hosts.map(normalizeRouteHost)
    }
  }).sort((left, right) => (
    right.parsedPath.specificity - left.parsedPath.specificity
    || left.definition.pathPattern.localeCompare(right.definition.pathPattern)
    || left.definition.id.localeCompare(right.definition.id)
  ))

  return {
    environmentId: input.environmentId,
    defaultDomain: input.defaultDomain ? normalizeRouteHost(input.defaultDomain) : null,
    revisionId: input.revisionId,
    routes,
    upstreams
  }
}

async function loadCompiledEnvironments(): Promise<CompiledEnvironment[]> {
  const rows = await db.select({
    environmentId: environments.id,
    defaultDomain: environments.defaultDomain,
    revisionId: routingRevisions.id,
    checksum: routingRevisions.checksum,
    payload: routingRevisions.configPayload
  }).from(environments)
    .innerJoin(routingRevisions, eq(routingRevisions.id, environments.activeRevisionId))
    .where(eq(environments.status, 'active'))

  const compiled = rows.map(compileEnvironment)
  const conflict = findRoutingRouteConflict(compiled.map(environment => ({
    environmentId: environment.environmentId,
    defaultDomain: environment.defaultDomain,
    routes: environment.routes.map(route => route.definition)
  })))
  if (conflict) {
    throw new Error(`active routing revisions conflict: ${JSON.stringify(conflict)}`)
  }
  return compiled
}

async function getCompiledEnvironments(): Promise<CompiledEnvironment[]> {
  const now = Date.now()
  const generation = runtimeGeneration
  if (runtimeCache && runtimeCache.generation === generation && runtimeCache.expiresAt > now) {
    return runtimeCache.environments
  }

  try {
    const compiled = await loadCompiledEnvironments()
    runtimeCache = { generation, expiresAt: now + CACHE_TTL_MS, environments: compiled }
    return compiled
  } catch (error) {
    console.error('[gateway] Failed to load active routing revisions; retaining the last valid runtime.', error)
    if (runtimeCache) {
      runtimeCache.expiresAt = now + CACHE_TTL_MS
      return runtimeCache.environments
    }
    return []
  }
}

function routeHostSpecificity(route: CompiledRoute, environment: CompiledEnvironment, requestHost: string): number {
  const hosts = route.hosts.length > 0
    ? route.hosts
    : environment.defaultDomain
      ? [environment.defaultDomain]
      : []
  if (hosts.length === 0) return 0

  let best = -1
  for (const host of hosts) {
    if (!routeHostMatches(host, requestHost)) continue
    const specificity = host.startsWith('*.')
      ? 1_000_000 + host.length
      : 2_000_000 + host.length
    best = Math.max(best, specificity)
  }
  return best
}

interface ResolvedCandidate {
  environment: CompiledEnvironment
  route: CompiledRoute
  params: Record<string, string>
  hostSpecificity: number
  methodSpecificity: number
}

function candidateOutranks(left: ResolvedCandidate, right: ResolvedCandidate): boolean {
  if (left.hostSpecificity !== right.hostSpecificity) return left.hostSpecificity > right.hostSpecificity
  if (left.route.parsedPath.specificity !== right.route.parsedPath.specificity) {
    return left.route.parsedPath.specificity > right.route.parsedPath.specificity
  }
  if (left.methodSpecificity !== right.methodSpecificity) return left.methodSpecificity > right.methodSpecificity
  const pathOrder = left.route.definition.pathPattern.localeCompare(right.route.definition.pathPattern)
  if (pathOrder !== 0) return pathOrder < 0
  const environmentOrder = left.environment.environmentId.localeCompare(right.environment.environmentId)
  if (environmentOrder !== 0) return environmentOrder < 0
  return left.route.definition.id.localeCompare(right.route.definition.id) < 0
}

export const routingRuntimeService = {
  async resolveAllowedMethods(pathname: string, requestHost: string): Promise<string[]> {
    const environments = await getCompiledEnvironments()
    const methods = new Set<string>()

    for (const environment of environments) {
      for (const route of environment.routes) {
        if (routeHostSpecificity(route, environment, requestHost) < 0) continue
        if (!matchRoutePath(route.parsedPath, pathname)) continue
        methods.add(route.definition.method)
        if (route.definition.method === 'GET') methods.add('HEAD')
      }
    }

    return HTTP_METHOD_ORDER.filter(method => methods.has(method))
  },

  async resolve(method: string, pathname: string, requestHost: string): Promise<ResolvedDynamicRoute | null> {
    const environments = await getCompiledEnvironments()
    const normalizedMethod = method.toUpperCase()
    let best: ResolvedCandidate | null = null

    for (const environment of environments) {
      for (const route of environment.routes) {
        if (route.definition.method !== normalizedMethod && !(normalizedMethod === 'HEAD' && route.definition.method === 'GET')) continue
        const hostSpecificity = routeHostSpecificity(route, environment, requestHost)
        if (hostSpecificity < 0) continue
        const match = matchRoutePath(route.parsedPath, pathname)
        if (!match) continue
        const candidate: ResolvedCandidate = {
          environment,
          route,
          params: match.params,
          hostSpecificity,
          methodSpecificity: route.definition.method === normalizedMethod ? 1 : 0
        }
        if (!best || candidateOutranks(candidate, best)) best = candidate
      }
    }
    if (!best) return null
    return {
      environmentId: best.environment.environmentId,
      revisionId: best.environment.revisionId,
      route: best.route.definition,
      upstream: best.environment.upstreams.get(best.route.definition.upstreamServiceId)!,
      params: best.params
    }
  }
}
