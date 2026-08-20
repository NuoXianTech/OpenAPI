import type { ServiceEndpointSummary } from '#shared/types/service-control'
import { asc, eq } from 'drizzle-orm'
import { db, type DatabaseTransaction } from '~~/server/db/client'
import { environments } from '~~/server/db/schema'
import {
  invalidateRoutingPublicationCaches,
  routingRevisionService
} from '~~/server/services/routing-revision-service'
import type { RoutingRevisionRoute } from '~~/server/types/routing-revision'
import type {
  HttpMethod,
  PublicationStatus,
  RouteBinding,
  RouteMutationInput
} from '~~/server/types/platform-publication'
import { canonicalJson } from '~~/server/utils/canonical-json'
import { parseRoutePathPattern } from '~~/server/utils/route-pattern'
import { toRoutingRevisionRoute } from '~~/server/utils/routing-revision-route'

export interface WorkspacePublication {
  revisions: Array<{
    id: string
    sequence: number
    environmentId: string
  }>
}

export function endpointPublicationStatus(
  binding: RouteBinding | null,
  liveRoutes: ReadonlyMap<string, RoutingRevisionRoute>
): PublicationStatus {
  if (!binding) return 'available'
  const live = liveRoutes.get(binding.route.id)
  const desiredActive = binding.route.state === 'active'
  if (
    desiredActive
    && live
    && canonicalJson(toRoutingRevisionRoute(binding)) === canonicalJson(live)
  ) return 'live'
  if (desiredActive) return 'pending'
  if (live) return 'retiring'
  return 'disabled'
}

function endpointShape(path: string): string | null {
  try {
    return parseRoutePathPattern(path).normalizedShape
  } catch {
    return null
  }
}

function upstreamTemplateShape(path: string): string | null {
  try {
    return parseRoutePathPattern(
      path.replace(/\{path\.([A-Za-z][A-Za-z0-9_]*)\}/g, '{$1}')
    ).normalizedShape
  } catch {
    return null
  }
}

export function endpointUpstreamTemplate(path: string): string {
  const parsed = parseRoutePathPattern(path)
  return parsed.pathPattern.replace(
    /\{([A-Za-z][A-Za-z0-9_]*)(\+)?\}/g,
    (_value, name: string) => `{path.${name}}`
  )
}

export function routeMatchesEndpoint(
  binding: RouteBinding,
  endpoint: ServiceEndpointSummary
): boolean {
  return binding.route.method === endpoint.method
    && endpointShape(endpoint.path) !== null
    && endpointShape(endpoint.path)
    === upstreamTemplateShape(binding.route.upstreamPathTemplate)
}

export function endpointRoutePriority(
  binding: RouteBinding,
  liveRoutes: ReadonlyMap<string, RoutingRevisionRoute>
): number {
  const status = endpointPublicationStatus(binding, liveRoutes)
  if (status === 'live') return 0
  if (status === 'pending') return 1
  if (status === 'retiring') return 2
  return 3
}

function workspacePublication(
  revisions: Awaited<ReturnType<typeof routingRevisionService.publishWorkspace>>
): WorkspacePublication {
  return {
    revisions: revisions.map(revision => ({
      id: revision.id,
      sequence: revision.sequence,
      environmentId: revision.environmentId
    }))
  }
}

export async function applyWorkspaceRevision(
  workspaceId: string,
  createdBy: number | null
) {
  return workspacePublication(await routingRevisionService.publishWorkspace(
    workspaceId,
    createdBy
  ))
}

async function lockEnvironmentSet(tx: DatabaseTransaction) {
  await tx.select({ id: environments.id }).from(environments)
    .orderBy(asc(environments.id))
    .for('update')
}

async function readActiveEnvironments(tx: DatabaseTransaction) {
  return tx.select().from(environments)
    .where(eq(environments.status, 'active'))
    .orderBy(asc(environments.id))
}

export async function applyEnvironmentMutation<T>(
  environmentId: string,
  createdBy: number | null,
  mutate: (tx: DatabaseTransaction) => Promise<T>
) {
  const committed = await db.transaction(async (tx: DatabaseTransaction) => {
    await lockEnvironmentSet(tx)
    const value = await mutate(tx)
    const activeEnvironments = await readActiveEnvironments(tx)
    const revision = await routingRevisionService.publish(
      environmentId,
      createdBy,
      { tx, activeEnvironments }
    )
    return { value, revision }
  })
  await invalidateRoutingPublicationCaches()
  return {
    value: committed.value,
    revision: committed.revision
  }
}

export async function applyWorkspaceMutation<T>(
  createdBy: number | null,
  mutate: (tx: DatabaseTransaction) => Promise<{
    value: T
    workspaceId: string
    publishRouting?: boolean
  }>
) {
  const committed = await db.transaction(async (tx: DatabaseTransaction) => {
    await lockEnvironmentSet(tx)
    const mutation = await mutate(tx)
    const activeEnvironments = await readActiveEnvironments(tx)
    const revisions = mutation.publishRouting === false
      ? []
      : await routingRevisionService.publishWorkspace(
          mutation.workspaceId,
          createdBy,
          { tx, activeEnvironments }
        )
    return { ...mutation, revisions }
  })
  if (committed.publishRouting !== false) {
    await invalidateRoutingPublicationCaches()
  }
  return {
    value: committed.value,
    ...workspacePublication(committed.revisions)
  }
}

export function routeMutationFromBinding(
  binding: RouteBinding,
  patch: Partial<RouteMutationInput> = {}
): RouteMutationInput {
  return {
    apiVersionId: binding.route.apiVersionId,
    name: binding.route.name,
    hosts: binding.route.hosts,
    method: binding.route.method as HttpMethod,
    pathPattern: binding.route.pathPattern,
    upstreamServiceId: binding.route.upstreamServiceId,
    upstreamPathTemplate: binding.route.upstreamPathTemplate,
    isApiKey: binding.route.isApiKey,
    isStatistics: binding.route.isStatistics,
    creditsCost: binding.route.creditsCost,
    rateLimitPerSecond: binding.route.rateLimitPerSecond,
    rateLimitPerMinute: binding.route.rateLimitPerMinute,
    rateLimitPerHour: binding.route.rateLimitPerHour,
    rateLimitPerDay: binding.route.rateLimitPerDay,
    timeoutMs: binding.route.timeoutMs,
    maxRequestBytes: binding.route.maxRequestBytes,
    maxResponseBytes: binding.route.maxResponseBytes,
    catalogStatus: binding.route.catalogStatus as RouteMutationInput['catalogStatus'],
    sensitiveQueryParameters: binding.route.sensitiveQueryParameters,
    state: binding.route.state as RouteMutationInput['state'],
    ...patch
  }
}
