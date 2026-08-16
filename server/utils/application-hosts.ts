import { normalizeRouteHost, routeHostMatches } from '~~/server/utils/route-pattern'

export type ApplicationHostRole = 'console' | 'gateway' | 'combined' | 'unknown'

interface ApplicationHosts {
  console: string[]
  gateway: string[]
}

function readConfiguredHosts(): { console?: unknown, gateway?: unknown } {
  try {
    return useRuntimeConfig().hosts as { console?: unknown, gateway?: unknown }
  } catch {
    // Plain unit tests do not install Nuxt's runtime auto-imports. The
    // environment fallback also keeps startup validation deterministic.
    return {
      console: process.env.NUXT_HOSTS_CONSOLE,
      gateway: process.env.NUXT_HOSTS_GATEWAY
    }
  }
}

function parseHosts(value: unknown, allowWildcard: boolean): string[] {
  return Array.from(new Set(String(value ?? '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
    .map(item => (allowWildcard && item === '*' ? '*' : normalizeRouteHost(item)))))
}

export function getApplicationHosts(): ApplicationHosts {
  const hosts = readConfiguredHosts()
  return {
    console: parseHosts(hosts.console, false),
    gateway: parseHosts(hosts.gateway, true)
  }
}

export function getApplicationHostErrors(): string[] {
  const hosts = getApplicationHosts()
  if (process.env.NODE_ENV !== 'production' && hosts.console.length === 0 && hosts.gateway.length === 0) {
    return []
  }
  const errors: string[] = []
  if (hosts.console.length === 0) errors.push('NUXT_HOSTS_CONSOLE must contain at least one Console hostname')
  if (hosts.gateway.length === 0) errors.push('NUXT_HOSTS_GATEWAY must contain at least one Gateway hostname or wildcard')
  const duplicates = hosts.console.filter(host => hosts.gateway.includes(host))
  if (duplicates.length > 0) {
    errors.push(`Console and Gateway hostnames must be different: ${duplicates.join(', ')}`)
  }
  return errors
}

export function resolveApplicationHostRole(requestHost: string): ApplicationHostRole {
  const hosts = getApplicationHosts()
  if (hosts.console.length === 0 && hosts.gateway.length === 0) return 'combined'
  const normalized = normalizeRouteHost(requestHost)
  if (hosts.console.includes(normalized)) return 'console'
  if (hosts.gateway.some(host => host === '*' || routeHostMatches(host, normalized))) return 'gateway'
  return 'unknown'
}
