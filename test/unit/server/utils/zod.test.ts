import { Readable } from 'node:stream'
import type { H3Event } from 'h3'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { readZodBody } from '~~/server/utils/zod'

function createBodyEvent(chunks: Array<Buffer | string>, maxBodySize: number): H3Event {
  const request = Readable.from(chunks) as Readable & {
    headers: Record<string, string>
  }
  request.headers = {
    'content-type': 'application/json',
    'transfer-encoding': 'chunked'
  }

  return {
    method: 'POST',
    context: { __maxBodySize: maxBodySize },
    node: { req: request, res: {} }
  } as unknown as H3Event
}

describe('readZodBody', () => {
  it('parses a chunked body while it remains within the configured limit', async () => {
    const event = createBodyEvent(['{"name":', '"Codex"}'], 100)

    await expect(readZodBody(event, z.object({ name: z.string() })))
      .resolves.toEqual({ name: 'Codex' })
  })

  it('rejects a chunked body as soon as its accumulated bytes exceed the limit', async () => {
    const event = createBodyEvent(['{"name":', '"too long"}'], 10)

    await expect(readZodBody(event, z.object({ name: z.string() })))
      .rejects.toMatchObject({ statusCode: 413 })
  })
})
