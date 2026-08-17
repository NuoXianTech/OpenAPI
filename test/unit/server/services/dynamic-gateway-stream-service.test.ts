import type { H3Event } from 'h3'
import { describe, expect, it } from 'vitest'
import type { GatewayExecutionError } from '~~/server/errors/gateway-error'
import {
  assertGatewayRequestSize,
  limitGatewayUpstreamResponse
} from '~~/server/services/dynamic-gateway-stream-service'

function event(method: string, contentLength?: string): H3Event {
  return {
    method,
    node: {
      req: {
        headers: contentLength === undefined
          ? {}
          : { 'content-length': contentLength }
      }
    }
  } as unknown as H3Event
}

describe('dynamic gateway request limits', () => {
  it('allows a bodyless payload method when the route limit is zero', () => {
    expect(() => assertGatewayRequestSize(event('POST'), 0)).not.toThrow()
    expect(() => assertGatewayRequestSize(event('POST', '0'), 0)).not.toThrow()
  })

  it('reports a body as unsupported when the route limit is zero', () => {
    expect(() => assertGatewayRequestSize(event('POST', '1'), 0))
      .toThrow(expect.objectContaining<Partial<GatewayExecutionError>>({
        code: 'REQUEST_BODY_NOT_ALLOWED',
        status: 413
      }))
  })

  it('reports an oversized body when a positive limit is exceeded', () => {
    expect(() => assertGatewayRequestSize(event('PUT', '11'), 10))
      .toThrow(expect.objectContaining<Partial<GatewayExecutionError>>({
        code: 'REQUEST_BODY_TOO_LARGE',
        status: 413
      }))
  })

  it('does not reject a bodyless response because of its content-length metadata', async () => {
    const observedBytes: number[] = []
    const response = await limitGatewayUpstreamResponse(
      new Response(null, {
        status: 204,
        headers: { 'content-length': '1024' }
      }),
      0,
      bytes => observedBytes.push(bytes)
    )

    expect(response.status).toBe(204)
    expect(response.body).toBeNull()
    expect(observedBytes).toEqual([0])
  })
})
