import { PassThrough } from 'node:stream'
import type { H3Event } from 'h3'
import { describe, expect, it } from 'vitest'
import { readOpenApiJsonBody } from '~~/server/utils/zod'

function createEvent(body: string, headers: Record<string, string>): H3Event {
  const request = new PassThrough() as PassThrough & {
    headers: Record<string, string>
  }
  request.headers = headers
  request.end(body)

  return {
    node: { req: request }
  } as unknown as H3Event
}

describe('readOpenApiJsonBody', () => {
  it('parses a JSON request within the limit', async () => {
    const body = JSON.stringify({ value: 'ok' })
    const event = createEvent(body, {
      'content-length': String(Buffer.byteLength(body)),
      'content-type': 'application/json'
    })

    await expect(readOpenApiJsonBody(event, 64)).resolves.toEqual({ value: 'ok' })
  })

  it('rejects an oversized declared content length before reading', async () => {
    const event = createEvent('{}', {
      'content-length': '65',
      'content-type': 'application/json'
    })

    await expect(readOpenApiJsonBody(event, 64)).rejects.toMatchObject({ statusCode: 413 })
  })

  it('rejects an oversized chunked body while streaming', async () => {
    const event = createEvent('x'.repeat(65), {
      'transfer-encoding': 'chunked',
      'content-type': 'text/plain'
    })

    await expect(readOpenApiJsonBody(event, 64)).rejects.toMatchObject({ statusCode: 413 })
  })
})
