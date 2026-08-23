import type {
  PlatformProduct,
  PlatformRoute,
  PlatformRouteBinding,
  PlatformUpstream
} from '#shared/types/platform'

export type HttpMethod = PlatformRoute['method']
export type RouteState = PlatformRoute['state']

export interface RouteFormState {
  apiVersionId: string
  name: string
  method: HttpMethod
  pathPattern: string
  hostsText: string
  upstreamServiceId: string
  upstreamPathTemplate: string
  isApiKey: boolean
  isStatistics: boolean
  creditsCost: number
  rateLimitPerSecond: number
  rateLimitPerMinute: number
  rateLimitPerHour: number
  rateLimitPerDay: number
  timeoutMs: number
  maxRequestKiB: number
  maxResponseKiB: number
  catalogStatus: PlatformRoute['catalogStatus']
  sensitiveQueryParameters: string[]
  state: RouteState
}

export interface RouteBindingOption {
  label: string
  value: string
  description: string
}

export function createRouteFormState(
  binding?: PlatformRouteBinding | null
): RouteFormState {
  if (!binding) {
    return {
      apiVersionId: '',
      name: '',
      method: 'GET',
      pathPattern: '/v1/',
      hostsText: '',
      upstreamServiceId: '',
      upstreamPathTemplate: '/',
      isApiKey: false,
      isStatistics: true,
      creditsCost: 0,
      rateLimitPerSecond: 0,
      rateLimitPerMinute: 0,
      rateLimitPerHour: 0,
      rateLimitPerDay: 0,
      timeoutMs: 10_000,
      maxRequestKiB: 1024,
      maxResponseKiB: 10_240,
      catalogStatus: 'automatic',
      sensitiveQueryParameters: [],
      state: 'active'
    }
  }

  const route = binding.route
  return {
    apiVersionId: route.apiVersionId,
    name: route.name,
    method: route.method,
    pathPattern: route.pathPattern,
    hostsText: route.hosts.join('\n'),
    upstreamServiceId: route.upstreamServiceId,
    upstreamPathTemplate: route.upstreamPathTemplate,
    isApiKey: route.isApiKey,
    isStatistics: route.isStatistics,
    creditsCost: route.creditsCost,
    rateLimitPerSecond: route.rateLimitPerSecond,
    rateLimitPerMinute: route.rateLimitPerMinute,
    rateLimitPerHour: route.rateLimitPerHour,
    rateLimitPerDay: route.rateLimitPerDay,
    timeoutMs: route.timeoutMs,
    maxRequestKiB: route.maxRequestBytes / 1024,
    maxResponseKiB: route.maxResponseBytes / 1024,
    catalogStatus: route.catalogStatus,
    sensitiveQueryParameters: [...route.sensitiveQueryParameters],
    state: route.state
  }
}

export function routeVersionOptions(
  products: PlatformProduct[],
  workspaceId: string,
  current?: PlatformRouteBinding | null
): RouteBindingOption[] {
  const items = products
    .filter(product => (
      product.workspaceId === workspaceId && product.lifecycle === 'active'
    ))
    .flatMap(product => product.versions
      .filter(version => (
        version.state === 'published' || version.state === 'deprecated'
      ))
      .map(version => ({
        label: `${product.name} / ${version.version}`,
        value: version.id,
        description: product.slug
      })))
  if (current && !items.some(item => item.value === current.version.id)) {
    items.unshift({
      label: `${current.product.name} / ${current.version.version}`,
      value: current.version.id,
      description: current.product.slug
    })
  }
  return items
}

export function routeUpstreamOptions(
  upstreams: PlatformUpstream[],
  workspaceId: string,
  current?: PlatformRouteBinding | null
): RouteBindingOption[] {
  const items = upstreams
    .filter(upstream => (
      upstream.workspaceId === workspaceId && upstream.status === 'active'
    ))
    .map(upstream => ({
      label: upstream.name,
      value: upstream.id,
      description: upstream.slug
    }))
  const currentUpstream = current?.upstream
  if (
    currentUpstream
    && !items.some(item => item.value === currentUpstream.id)
  ) {
    items.unshift({
      label: currentUpstream.name,
      value: currentUpstream.id,
      description: currentUpstream.slug
    })
  }
  return items
}

export function parseRouteHosts(value: string): string[] {
  return Array.from(new Set(
    value.split(/[\s,]+/).map(host => host.trim()).filter(Boolean)
  ))
}

export function routeMutationPayload(state: RouteFormState) {
  return {
    apiVersionId: state.apiVersionId,
    name: state.name.trim(),
    hosts: parseRouteHosts(state.hostsText),
    method: state.method,
    pathPattern: state.pathPattern.trim(),
    upstreamServiceId: state.upstreamServiceId,
    upstreamPathTemplate: state.upstreamPathTemplate.trim(),
    isApiKey: state.isApiKey,
    isStatistics: state.isStatistics,
    creditsCost: state.creditsCost,
    rateLimitPerSecond: state.rateLimitPerSecond,
    rateLimitPerMinute: state.rateLimitPerMinute,
    rateLimitPerHour: state.rateLimitPerHour,
    rateLimitPerDay: state.rateLimitPerDay,
    timeoutMs: state.timeoutMs,
    maxRequestBytes: state.maxRequestKiB * 1024,
    maxResponseBytes: state.maxResponseKiB * 1024,
    catalogStatus: state.catalogStatus,
    sensitiveQueryParameters: Array.from(new Set(
      state.sensitiveQueryParameters.map(item => item.trim()).filter(Boolean)
    )),
    state: state.state
  }
}
