import { afterEach, describe, expect, it } from 'vitest'
import {
  getApplicationHostErrors,
  isGatewayRequest,
  resolveApplicationHostRole
} from '~~/server/utils/application-hosts'

const originalEnvironment = process.env.NODE_ENV
const originalConsoleHosts = process.env.NUXT_HOSTS_CONSOLE
const originalGatewayHosts = process.env.NUXT_HOSTS_GATEWAY

afterEach(() => {
  process.env.NODE_ENV = originalEnvironment
  process.env.NUXT_HOSTS_CONSOLE = originalConsoleHosts
  process.env.NUXT_HOSTS_GATEWAY = originalGatewayHosts
})

describe('application hosts', () => {
  it('classifies arbitrary non-Platform paths as Gateway traffic', () => {
    expect(isGatewayRequest('gateway', '/weather')).toBe(true)
    expect(isGatewayRequest('combined', '/weather')).toBe(true)
    expect(isGatewayRequest('combined', '/admin/users')).toBe(false)
    expect(isGatewayRequest('console', '/v1/player')).toBe(false)
  })

  it('keeps development combined when no hosts are configured', () => {
    process.env.NODE_ENV = 'development'
    delete process.env.NUXT_HOSTS_CONSOLE
    delete process.env.NUXT_HOSTS_GATEWAY

    expect(getApplicationHostErrors()).toEqual([])
    expect(resolveApplicationHostRole('localhost')).toBe('combined')
  })

  it('separates Console and Gateway hosts in production', () => {
    process.env.NODE_ENV = 'production'
    process.env.NUXT_HOSTS_CONSOLE = 'console.example.com'
    process.env.NUXT_HOSTS_GATEWAY = 'api.example.com,*.gateway.example.com'

    expect(getApplicationHostErrors()).toEqual([])
    expect(resolveApplicationHostRole('console.example.com')).toBe('console')
    expect(resolveApplicationHostRole('api.example.com')).toBe('gateway')
    expect(resolveApplicationHostRole('cn.gateway.example.com')).toBe('gateway')
    expect(resolveApplicationHostRole('unknown.example.com')).toBe('unknown')
  })

  it('rejects missing and overlapping production host configuration', () => {
    process.env.NODE_ENV = 'production'
    process.env.NUXT_HOSTS_CONSOLE = 'same.example.com'
    process.env.NUXT_HOSTS_GATEWAY = 'same.example.com'

    expect(getApplicationHostErrors()).toEqual([
      'Console and Gateway hostnames must be different: same.example.com'
    ])

    delete process.env.NUXT_HOSTS_GATEWAY
    expect(getApplicationHostErrors()).toContain(
      'NUXT_HOSTS_GATEWAY must contain at least one Gateway hostname or wildcard'
    )
  })
})
