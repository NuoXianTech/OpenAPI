import { createServer, type Server } from 'node:http'
import { afterEach, describe, expect, it } from 'vitest'
import {
  closeSafeFetchTransports,
  safeFetch
} from '~~/server/utils/safe-fetch'

let server: Server | null = null

afterEach(async () => {
  await closeSafeFetchTransports()
  if (!server) return
  await new Promise<void>((resolve, reject) => {
    server!.close(error => error ? reject(error) : resolve())
  })
  server = null
})

describe('safeFetch transport reuse', () => {
  it('keeps one connection for repeated requests to a fixed Target', async () => {
    let connections = 0
    server = createServer((_request, response) => response.end('ok'))
    server.on('connection', () => {
      connections += 1
    })
    await new Promise<void>((resolve, reject) => {
      server!.once('error', reject)
      server!.listen(0, '127.0.0.1', () => resolve())
    })
    const address = server.address()
    if (!address || typeof address === 'string') {
      throw new Error('test server did not expose a port')
    }
    const options = {
      allowedHosts: ['127.0.0.1'],
      allowHttp: true,
      allowPrivateNetworks: true,
      allowNonDefaultPort: true,
      followRedirects: false
    } as const

    const first = await safeFetch(
      `http://127.0.0.1:${address.port}/first`,
      options
    )
    await first.text()
    await new Promise<void>(resolve => setImmediate(resolve))
    const second = await safeFetch(
      `http://127.0.0.1:${address.port}/second`,
      options
    )
    await second.text()

    expect(connections).toBe(1)
  })
})
