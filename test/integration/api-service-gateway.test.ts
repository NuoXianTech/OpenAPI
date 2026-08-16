import { spawn, type ChildProcess } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { createServer, type Server } from 'node:http'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { migrate } from 'drizzle-orm/pglite/migrator'
import {
  createApp,
  eventHandler,
  setResponseStatus,
  toNodeListener
} from 'h3'
import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
  vi
} from 'vitest'
import * as schema from '~~/server/db/schema'

const serviceToken = 'gateway-acceptance-token-with-at-least-32-characters'
const apiKeySecret = '0123456789abcdef0123456789abcdef'
const testContext = vi.hoisted(() => ({ database: null as unknown }))

vi.mock('~~/server/db/client', () => ({
  get db() {
    return testContext.database
  }
}))
vi.stubGlobal('useRuntimeConfig', () => ({
  apiKeySecret
}))
vi.stubGlobal('defineNitroPlugin', (plugin: unknown) => plugin)

const { apiKeyService } = await import(
  '~~/server/services/api-key-service'
)
const { dynamicGatewayService } = await import(
  '~~/server/services/dynamic-gateway-service'
)
const { platformProductService } = await import(
  '~~/server/services/platform-product-service'
)
const { platformRouteService } = await import(
  '~~/server/services/platform-route-service'
)
const { platformServiceControlService } = await import(
  '~~/server/services/platform-service-control-service'
)
const { platformUpstreamService } = await import(
  '~~/server/services/platform-upstream-service'
)
const { platformWorkspaceService } = await import(
  '~~/server/services/platform-workspace-service'
)
const { routingRevisionService } = await import(
  '~~/server/services/routing-revision-service'
)
const { recordApiCall } = await import(
  '~~/server/plugins/api-call-stats'
)
const { getAppEventContext } = await import(
  '~~/server/utils/event-context'
)

let databaseClient: PGlite | undefined
let serviceProcess: ChildProcess | undefined
let serviceRuntimeDirectory = ''
let gatewayServer: Server | undefined
let gatewayBaseURL = ''
let serviceBaseURL = ''
let serviceOutput = ''
let serviceErrorOutput = ''
let paidApiKey = ''
let poorApiKey = ''
let paidUserId = 0
let poorUserId = 0
let environmentId = ''
let officialVersionId = ''
let officialUpstreamId = ''
let initialRevisionId = ''

const routeIds = {
  yiyan: '',
  player: '',
  artplayer: '',
  playerAsset: '',
  ip: '',
  limitedYiyan: '',
  bodyRejected: '',
  contract: '',
  lifecycle: ''
}

beforeAll(async () => {
  const serviceRepository = resolve(
    process.env.OPENAPI_SERVICE_REPO
    ?? resolve(process.cwd(), '..', 'openapi-service')
  )
  const serviceEntry = resolve(serviceRepository, 'dist', 'index.js')
  if (!existsSync(serviceEntry)) {
    throw new Error(
      `API Service build was not found at ${serviceEntry}; run pnpm build in openapi-service first`
    )
  }

  const servicePort = await reservePort()
  serviceRuntimeDirectory = await mkdtemp(join(tmpdir(), 'openapi-service-acceptance-'))
  serviceBaseURL = `http://127.0.0.1:${servicePort}`
  serviceProcess = spawn(
    process.execPath,
    ['--enable-source-maps', serviceEntry],
    {
      cwd: serviceRepository,
      env: {
        ...process.env,
        LISTEN_ADDR: `127.0.0.1:${servicePort}`,
        API_SERVICE_TOKEN: serviceToken,
        SHUTDOWN_TIMEOUT: '2s',
        SERVICE_CONFIG_FILE: join(serviceRuntimeDirectory, 'configuration.enc'),
        SERVICE_VERSION: 'gateway-acceptance',
        SERVICE_COMMIT: 'local'
      },
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true
    }
  )
  serviceProcess.stdout?.setEncoding('utf8')
  serviceProcess.stderr?.setEncoding('utf8')
  serviceProcess.stdout?.on('data', (chunk) => {
    serviceOutput = keepTail(serviceOutput + String(chunk))
  })
  serviceProcess.stderr?.on('data', (chunk) => {
    serviceErrorOutput = keepTail(serviceErrorOutput + String(chunk))
  })
  await waitUntilReady(serviceProcess, serviceBaseURL)

  databaseClient = new PGlite()
  const database = drizzle(databaseClient, { schema })
  testContext.database = database
  await migrate(database, {
    migrationsFolder: resolve(
      process.cwd(),
      'server/db/migrations/postgresql'
    ),
    migrationsSchema: 'drizzle',
    migrationsTable: '__drizzle_migrations'
  })

  const defaults = await platformWorkspaceService.ensureDefault()
  environmentId = defaults.environment.id
  const product = await platformProductService.create({
    workspaceId: defaults.workspace.id,
    slug: 'official-public-apis',
    name: 'Official public APIs',
    visibility: 'public',
    version: 'v1'
  })
  const upstream = await platformUpstreamService.create({
    workspaceId: defaults.workspace.id,
    slug: 'official-api-service',
    name: 'Official API Service',
    kind: 'internal',
    serviceToken,
    loadBalancing: 'round_robin',
    targets: [
      {
        baseUrl: serviceBaseURL,
        weight: 1
      }
    ]
  })
  const versionId = product.versions[0]!.id
  officialVersionId = versionId
  officialUpstreamId = upstream.id
  await platformServiceControlService.discover(upstream.id)

  routeIds.yiyan = await createRoute({
    apiVersionId: versionId,
    upstreamServiceId: upstream.id,
    name: '一言',
    pathPattern: '/v1/yiyan',
    upstreamPathTemplate: '/v1/yiyan',
    isApiKey: true,
    isStatistics: true,
    creditsCost: 2
  })
  routeIds.player = await createRoute({
    apiVersionId: versionId,
    upstreamServiceId: upstream.id,
    name: 'DPlayer',
    pathPattern: '/v1/player',
    upstreamPathTemplate: '/v1/player',
    isStatistics: true
  })
  routeIds.artplayer = await createRoute({
    apiVersionId: versionId,
    upstreamServiceId: upstream.id,
    name: 'ArtPlayer',
    pathPattern: '/v1/player/art',
    upstreamPathTemplate: '/v1/player/art',
    isStatistics: true
  })
  routeIds.playerAsset = await createRoute({
    apiVersionId: versionId,
    upstreamServiceId: upstream.id,
    name: '播放器静态资源',
    pathPattern: '/v1/player/assets/{asset}',
    upstreamPathTemplate: '/v1/player/assets/{path.asset}',
    isStatistics: false,
    maxResponseBytes: 2 * 1024 * 1024
  })
  routeIds.ip = await createRoute({
    apiVersionId: versionId,
    upstreamServiceId: upstream.id,
    name: 'IP 归属地',
    pathPattern: '/v1/ip',
    upstreamPathTemplate: '/v1/ip',
    isApiKey: true,
    isStatistics: true,
    creditsCost: 3
  })
  routeIds.limitedYiyan = await createRoute({
    apiVersionId: versionId,
    upstreamServiceId: upstream.id,
    name: '一言限流验收',
    pathPattern: '/v1/yiyan-rate-limited',
    upstreamPathTemplate: '/v1/yiyan',
    isApiKey: true,
    isStatistics: false,
    rateLimitPerMinute: 1
  })
  routeIds.bodyRejected = await createRoute({
    apiVersionId: versionId,
    upstreamServiceId: upstream.id,
    name: '请求体限制验收',
    method: 'POST',
    pathPattern: '/v1/body-not-allowed',
    upstreamPathTemplate: '/v1/yiyan',
    isStatistics: true
  })
  routeIds.contract = await createRoute({
    apiVersionId: versionId,
    upstreamServiceId: upstream.id,
    name: 'OpenAPI contract acceptance',
    pathPattern: '/v1/api-service-contract',
    upstreamPathTemplate: '/openapi.json',
    isStatistics: false,
    maxResponseBytes: 2 * 1024 * 1024
  })
  routeIds.lifecycle = await createRoute({
    apiVersionId: versionId,
    upstreamServiceId: upstream.id,
    name: 'Route 生命周期验收',
    pathPattern: '/v1/yiyan-lifecycle',
    upstreamPathTemplate: '/v1/yiyan',
    isStatistics: false
  })

  const paidUser = (await database.insert(schema.users).values({
    username: 'gateway-paid-user',
    email: 'gateway-paid@example.test',
    passwordHash: 'not-used-in-acceptance',
    credits: 10,
    isActive: true
  }).returning({ id: schema.users.id }))[0]!
  paidUserId = paidUser.id
  paidApiKey = (await apiKeyService.createForUser(paidUser.id, {
    name: 'Gateway acceptance',
    scopes: [
      `route:${routeIds.yiyan}`,
      `route:${routeIds.ip}`,
      `route:${routeIds.limitedYiyan}`
    ]
  }))[0]!.apiKey

  const poorUser = (await database.insert(schema.users).values({
    username: 'gateway-poor-user',
    email: 'gateway-poor@example.test',
    passwordHash: 'not-used-in-acceptance',
    credits: 1,
    isActive: true
  }).returning({ id: schema.users.id }))[0]!
  poorUserId = poorUser.id
  poorApiKey = (await apiKeyService.createForUser(poorUser.id, {
    name: 'Insufficient credits acceptance',
    scopes: [`route:${routeIds.yiyan}`]
  }))[0]!.apiKey

  initialRevisionId = (await routingRevisionService.publish(defaults.environment.id, null)).id

  const gateway = createApp()
  gateway.use(eventHandler(async (event) => {
    const result = await dynamicGatewayService.tryHandle(event)
    const tracked = getAppEventContext(event).apiStatsTracked
    if (tracked) await recordApiCall(event, tracked)
    if (result.matched) return result.response
    setResponseStatus(event, 404)
    return { code: 'NOT_FOUND' }
  }))
  gatewayServer = createServer(toNodeListener(gateway))
  const gatewayPort = await listen(gatewayServer)
  gatewayBaseURL = `http://127.0.0.1:${gatewayPort}`
})

afterAll(async () => {
  if (gatewayServer) {
    await closeServer(gatewayServer)
  }
  if (databaseClient) {
    await databaseClient.close()
  }
  if (serviceProcess) {
    await stopChild(serviceProcess)
  }
  if (serviceRuntimeDirectory) {
    await rm(serviceRuntimeDirectory, { recursive: true, force: true })
  }
})

describe('Platform to Node API Service acceptance', () => {
  it('discovers the Service contract and synchronizes redacted configuration', async () => {
    const discovered = await platformServiceControlService.get(
      officialUpstreamId
    )
    expect(discovered.connection).toMatchObject({
      discovered: true,
      availability: 'online',
      serviceId: 'openapi-service',
      configurationRevision: 0
    })
    expect(discovered.endpoints.map(endpoint => endpoint.path)).toEqual(
      expect.arrayContaining([
        '/v1/ip',
        '/v1/player',
        '/v1/yiyan'
      ])
    )

    const synchronized = await platformServiceControlService
      .updateConfiguration(officialUpstreamId, {
        expectedRevision: 0,
        values: { 'ip.enabled': true },
        secrets: {
          'ip.databaseKey': Buffer.from('fixture-key-1234').toString('base64')
        }
      })
    expect(synchronized).toMatchObject({
      status: 'synced',
      revision: 1,
      targets: [{ configurationStatus: 'synced' }]
    })

    const view = await platformServiceControlService.get(officialUpstreamId)
    expect(view.values['ip.databaseKey']).toEqual({ configured: true })
    const targetUrl = view.targets[0]!.baseUrl
    const stateResponse = await fetch(
      `${targetUrl.replace(/\/$/, '')}/.well-known/configuration.json`,
      { headers: { authorization: `Service ${serviceToken}` } }
    )
    const stateText = await stateResponse.text()
    expect(stateResponse.status).toBe(200)
    expect(stateText).not.toContain('fixture-key-1234')
    expect(JSON.parse(stateText)).toMatchObject({
      revision: 1,
      values: { 'ip.databaseKey': { configured: true } }
    })

    const stored = await queryOne<{
      service_token_ciphertext: string
      configuration_values: {
        values: Record<string, unknown>
        secrets: Record<string, string>
      }
    }>(
      `select service_token_ciphertext, configuration_values
       from upstream_service_connections
       where upstream_service_id = $1`,
      [officialUpstreamId]
    )
    expect(stored.service_token_ciphertext).toMatch(/^enc:service-token:v1:/)
    expect(stored.service_token_ciphertext).not.toContain(serviceToken)
    expect(stored.configuration_values.secrets['ip.databaseKey'])
      .toMatch(/^enc:service-configuration:v1:/)
    expect(JSON.stringify(stored.configuration_values))
      .not.toContain('fixture-key-1234')

    await expect(platformServiceControlService.updateConfiguration(
      officialUpstreamId,
      { expectedRevision: 0, values: {}, secrets: {} }
    )).rejects.toMatchObject({
      statusCode: 409,
      data: { code: 'SERVICE_CONFIGURATION_REVISION_CONFLICT' }
    })
  })

  it('reports a partial configuration sync when one target is unavailable', async () => {
    const upstream = await platformUpstreamService.create({
      workspaceId: (await platformWorkspaceService.ensureDefault()).workspace.id,
      slug: 'partial-sync-service',
      name: 'Partial sync Service',
      kind: 'internal',
      serviceToken,
      loadBalancing: 'round_robin',
      targets: [{ baseUrl: serviceBaseURL, weight: 1 }]
    })
    await platformServiceControlService.discover(upstream.id)
    const offlinePort = await reservePort()
    await databaseClient!.query(
      `insert into upstream_targets (upstream_service_id, base_url, weight)
       values ($1, $2, $3)`,
      [upstream.id, `http://127.0.0.1:${offlinePort}/`, 1]
    )

    await expect(platformServiceControlService.get(upstream.id))
      .resolves.toMatchObject({
        connection: { availability: 'degraded' }
      })

    const result = await platformServiceControlService.updateConfiguration(
      upstream.id,
      {
        expectedRevision: 0,
        values: { 'ip.enabled': true },
        secrets: {
          'ip.databaseKey': Buffer.from('fixture-key-1234').toString('base64')
        }
      }
    )

    expect(result.status).toBe('partial')
    expect(result.targets.map(target => target.configurationStatus)).toEqual(
      expect.arrayContaining(['synced', 'error'])
    )
  })

  it('publishes an Internal Route, replaces caller auth, and exposes only the first migrated APIs', async () => {
    const requestId = randomUUID()
    const response = await fetch(
      `${gatewayBaseURL}/v1/api-service-contract`,
      {
        headers: {
          'authorization': 'Bearer caller-token-must-be-replaced',
          'x-api-key': 'caller-api-key-must-not-reach-service',
          'x-openapi-route-id': 'forged-route-id',
          'x-request-id': requestId
        },
        signal: AbortSignal.timeout(5_000)
      }
    )
    const document = await response.json() as {
      openapi: string
      paths: Record<string, unknown>
    }

    expect(response.status).toBe(200)
    expect(response.headers.get('x-request-id')).toBe(requestId)
    expect(response.headers.get('x-openapi-sha256')).toMatch(
      /^[0-9a-f]{64}$/
    )
    expect(document.openapi).toBe('3.1.0')
    expect(Object.keys(document.paths)).toEqual(expect.arrayContaining([
      '/v1/ip',
      '/v1/player',
      '/v1/player/art',
      '/v1/player/assets/{asset}',
      '/v1/yiyan'
    ]))
    expect(Object.keys(document.paths).some(path => path.startsWith('/v1/music'))).toBe(false)
  })

  it('forwards conditional contract requests as 304', async () => {
    const firstResponse = await fetch(
      `${gatewayBaseURL}/v1/api-service-contract`,
      { signal: AbortSignal.timeout(5_000) }
    )
    await firstResponse.arrayBuffer()
    const etag = firstResponse.headers.get('etag')

    expect(firstResponse.status).toBe(200)
    expect(etag).toBeTruthy()

    const unchangedResponse = await fetch(
      `${gatewayBaseURL}/v1/api-service-contract`,
      {
        headers: {
          'if-none-match': etag ?? ''
        },
        signal: AbortSignal.timeout(5_000)
      }
    )

    expect(unchangedResponse.status).toBe(304)
    expect(await unchangedResponse.text()).toBe('')
    expect(unchangedResponse.headers.get('etag')).toBe(etag)
  })

  it('answers a published Route CORS preflight before authentication or billing', async () => {
    const callsBefore = await countCalls(routeIds.yiyan)
    const response = await fetch(`${gatewayBaseURL}/v1/yiyan`, {
      method: 'OPTIONS',
      headers: {
        'origin': 'https://client.example.test',
        'access-control-request-method': 'GET',
        'access-control-request-headers': 'x-api-key'
      }
    })

    expect(response.status).toBe(204)
    expect(response.headers.get('access-control-allow-origin')).toBe('*')
    expect(response.headers.get('access-control-allow-methods')).toBe('GET, HEAD, OPTIONS')
    expect(response.headers.get('access-control-allow-headers')).toBe('content-type, x-api-key')
    expect(await response.text()).toBe('')
    expect(await countCalls(routeIds.yiyan)).toBe(callsBefore)
  })

  it('normalizes Gateway request failures and records their stable error code', async () => {
    const callsBefore = await countCalls(routeIds.bodyRejected)
    const response = await fetch(`${gatewayBaseURL}/v1/body-not-allowed`, {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: 'not-allowed'
    })
    const body = await readPublicEnvelope(response)

    expect(response.status).toBe(413)
    expect(body).toMatchObject({
      code: 'REQUEST_BODY_NOT_ALLOWED',
      message: '此接口不接受请求体',
      data: null
    })
    expect(await countCalls(routeIds.bodyRejected)).toBe(callsBefore + 1)
    const call = await queryOne<{
      status_code: number
      error_code: string | null
      credits_cost: number
      is_counted: boolean
    }>(
      'select status_code, error_code, credits_cost, is_counted from api_calls where route_id = $1 order by id desc limit 1',
      [routeIds.bodyRejected]
    )
    expect(call).toEqual({
      status_code: 413,
      error_code: 'REQUEST_BODY_NOT_ALLOWED',
      credits_cost: 0,
      is_counted: true
    })
  })

  it('applies Route edits and soft deletes only through a new Revision and can roll back', async () => {
    const oldPath = '/v1/yiyan-lifecycle'
    const newPath = '/v1/yiyan-lifecycle-updated'

    const initial = await fetch(`${gatewayBaseURL}${oldPath}?type=a&id=a1`)
    expect(initial.status).toBe(200)
    await initial.arrayBuffer()

    await platformRouteService.update(routeIds.lifecycle, lifecycleRouteInput(newPath))

    const beforePublishOld = await fetch(`${gatewayBaseURL}${oldPath}?type=a&id=a1`)
    const beforePublishNew = await fetch(`${gatewayBaseURL}${newPath}?type=a&id=a1`)
    expect(beforePublishOld.status).toBe(200)
    expect(beforePublishNew.status).toBe(404)
    await beforePublishOld.arrayBuffer()
    await beforePublishNew.arrayBuffer()

    const updatedRevision = await routingRevisionService.publish(environmentId, null)
    const afterPublishOld = await fetch(`${gatewayBaseURL}${oldPath}?type=a&id=a1`)
    const afterPublishNew = await fetch(`${gatewayBaseURL}${newPath}?type=a&id=a1`)
    expect(afterPublishOld.status).toBe(404)
    expect(afterPublishNew.status).toBe(200)
    await afterPublishOld.arrayBuffer()
    await afterPublishNew.arrayBuffer()

    await platformRouteService.remove(routeIds.lifecycle)
    const beforeDeletePublish = await fetch(`${gatewayBaseURL}${newPath}?type=a&id=a1`)
    expect(beforeDeletePublish.status).toBe(200)
    await beforeDeletePublish.arrayBuffer()

    await routingRevisionService.publish(environmentId, null)
    const afterDeletePublish = await fetch(`${gatewayBaseURL}${newPath}?type=a&id=a1`)
    expect(afterDeletePublish.status).toBe(404)
    await afterDeletePublish.arrayBuffer()

    await routingRevisionService.activate(environmentId, updatedRevision.id)
    const rolledBack = await fetch(`${gatewayBaseURL}${newPath}?type=a&id=a1`)
    expect(rolledBack.status).toBe(200)
    await rolledBack.arrayBuffer()

    await routingRevisionService.activate(environmentId, initialRevisionId)
  })

  it('rejects missing and invalid API keys before calling a paid Service route', async () => {
    const before = await countCalls(routeIds.yiyan)

    const missing = await fetch(`${gatewayBaseURL}/v1/yiyan?type=a&id=a1`)
    const missingBody = await readPublicEnvelope(missing)
    expect(missing.status).toBe(401)
    expect(missingBody.code).toBe('MISSING_API_KEY')
    expect(missingBody.data).toBeNull()

    const invalid = await fetch(`${gatewayBaseURL}/v1/yiyan?type=a&id=a1`, {
      headers: { 'x-api-key': 'invalid-key' }
    })
    const invalidBody = await readPublicEnvelope(invalid)
    expect(invalid.status).toBe(401)
    expect(invalidBody.code).toBe('INVALID_API_KEY')
    expect(invalidBody.data).toBeNull()
    expect(await countCalls(routeIds.yiyan)).toBe(before)
  })

  it('charges credits once and writes a Route-based call log for a successful yiyan request', async () => {
    const response = await fetch(`${gatewayBaseURL}/v1/yiyan?type=a&id=a1&apikey=${encodeURIComponent(paidApiKey)}`, {
      headers: {
        'authorization': 'Bearer caller-token-must-be-replaced',
        'x-forwarded-for': '203.0.113.99'
      }
    })
    const body = await readPublicEnvelope<{ id: string, yiyan: string }>(response)

    expect(response.status).toBe(200)
    expect(body.code).toBe('OK')
    expect(body.message).toBe('请求成功')
    expect(body.data).toMatchObject({ id: 'a1' })

    const user = await queryOne<{ credits: number }>(
      'select credits from users where id = $1',
      [paidUserId]
    )
    const key = await queryOne<{
      used_credits: number
      total_calls: number
      last_used_ip: string | null
    }>(
      'select used_credits, total_calls, last_used_ip from api_keys where user_id = $1',
      [paidUserId]
    )
    const call = await queryOne<{
      route_id: string
      status_code: number
      credits_cost: number
      ip: string | null
      query_string: string | null
    }>(
      'select route_id, status_code, credits_cost, ip, query_string from api_calls where route_id = $1 order by id desc limit 1',
      [routeIds.yiyan]
    )
    const stats = await queryOne<{
      total_count: number
      success_count: number
    }>(
      'select coalesce(sum(total_count), 0)::int as total_count, coalesce(sum(success_count), 0)::int as success_count from api_call_stats where route_id = $1',
      [routeIds.yiyan]
    )
    const transaction = await queryOne<{
      amount: number
      route_id: string
    }>(
      'select amount, route_id from credit_transactions where user_id = $1 and reason = \'api_charge\' order by id desc limit 1',
      [paidUserId]
    )

    expect(user.credits).toBe(8)
    expect(key.used_credits).toBe(2)
    expect(key.total_calls).toBe(1)
    expect(key.last_used_ip).toBe('127.0.0.1')
    expect(call).toMatchObject({
      route_id: routeIds.yiyan,
      status_code: 200,
      credits_cost: 2,
      ip: '127.0.0.1'
    })
    expect(call.query_string).not.toContain(paidApiKey)
    expect(stats.total_count).toBeGreaterThan(0)
    expect(stats.success_count).toBeGreaterThan(0)
    expect(transaction).toEqual({ amount: -2, route_id: routeIds.yiyan })
  })

  it('serves DPlayer, ArtPlayer, and the bundled nuoxi4n DPlayer asset without a user API key', async () => {
    const mediaUrl = encodeURIComponent('https://cdn.example.com/video.m3u8')
    const dplayer = await fetch(
      `${gatewayBaseURL}/v1/player?url=${mediaUrl}&type=hls`
    )
    const dplayerHTML = await dplayer.text()
    expect(dplayer.status).toBe(200)
    expect(dplayerHTML).toContain('/v1/player/assets/dplayer-1.27.2-nuoxi4n.min.js')

    const customAsset = await fetch(
      `${gatewayBaseURL}/v1/player/assets/dplayer-1.27.2-nuoxi4n.min.js`
    )
    const customAssetBody = await customAsset.text()
    expect(customAsset.status).toBe(200)
    expect(customAsset.headers.get('cache-control')).toContain('immutable')
    expect(customAssetBody).toContain('nuoxi4n/DPlayer')
    expect(customAssetBody).toContain('1.27.2')

    const artplayer = await fetch(
      `${gatewayBaseURL}/v1/player/art?url=${mediaUrl}&type=m3u8`
    )
    expect(artplayer.status).toBe(200)
    expect(await artplayer.text()).toContain('new Artplayer')
  })

  it('releases the IP route reservation when the Service returns a 4xx error', async () => {
    const response = await fetch(`${gatewayBaseURL}/v1/ip?ip=not-an-ip`, {
      headers: { 'x-api-key': paidApiKey }
    })
    const body = await readPublicEnvelope(response)

    expect(response.status).toBe(400)
    expect(body.code).toBe('INVALID_IP')

    const user = await queryOne<{ credits: number }>(
      'select credits from users where id = $1',
      [paidUserId]
    )
    const key = await queryOne<{ used_credits: number }>(
      'select used_credits from api_keys where user_id = $1',
      [paidUserId]
    )
    const reservations = await queryOne<{ count: number }>(
      'select count(*)::int as count from api_credit_reservations where user_id = $1',
      [paidUserId]
    )
    const call = await queryOne<{
      status_code: number
      error_code: string | null
      credits_cost: number
      is_counted: boolean
    }>(
      'select status_code, error_code, credits_cost, is_counted from api_calls where route_id = $1 order by id desc limit 1',
      [routeIds.ip]
    )

    expect(user.credits).toBe(8)
    expect(key.used_credits).toBe(2)
    expect(reservations.count).toBe(0)
    expect(call).toEqual({
      status_code: 400,
      error_code: 'INVALID_IP',
      credits_cost: 0,
      is_counted: true
    })
  })

  it('records a Service 5xx error code without charging the caller', async () => {
    const response = await fetch(`${gatewayBaseURL}/v1/ip?ip=8.8.8.8`, {
      headers: { 'x-api-key': paidApiKey }
    })
    const body = await readPublicEnvelope(response)

    expect(response.status).toBe(503)
    expect(body.code).toBe('IP_DATABASE_UNAVAILABLE')
    const user = await queryOne<{ credits: number }>(
      'select credits from users where id = $1',
      [paidUserId]
    )
    const reservations = await queryOne<{ count: number }>(
      'select count(*)::int as count from api_credit_reservations where user_id = $1',
      [paidUserId]
    )
    const call = await queryOne<{
      status_code: number
      error_code: string | null
      credits_cost: number
    }>(
      'select status_code, error_code, credits_cost from api_calls where route_id = $1 order by id desc limit 1',
      [routeIds.ip]
    )

    expect(user.credits).toBe(8)
    expect(reservations.count).toBe(0)
    expect(call).toEqual({
      status_code: 503,
      error_code: 'IP_DATABASE_UNAVAILABLE',
      credits_cost: 0
    })
  })

  it('enforces Route scopes before reserving credits', async () => {
    const response = await fetch(`${gatewayBaseURL}/v1/ip?ip=not-an-ip`, {
      headers: { 'x-api-key': poorApiKey }
    })
    const body = await readPublicEnvelope(response)

    expect(response.status).toBe(403)
    expect(body.code).toBe('SCOPE_DENIED')

    const rejection = await queryOne<{
      error_code: string
      is_counted: boolean
    }>(
      'select error_code, is_counted from api_calls where route_id = $1 and user_id = $2 order by id desc limit 1',
      [routeIds.ip, poorUserId]
    )
    expect(rejection).toEqual({ error_code: 'SCOPE_DENIED', is_counted: false })
  })

  it('enforces the published per-minute Route rate limit', async () => {
    const request = () => fetch(
      `${gatewayBaseURL}/v1/yiyan-rate-limited?type=a&id=a1`,
      { headers: { 'x-api-key': paidApiKey } }
    )

    const first = await request()
    expect(first.status).toBe(200)
    await first.arrayBuffer()

    const limited = await request()
    const body = await readPublicEnvelope(limited)
    expect(limited.status).toBe(429)
    expect(body.code).toBe('RATE_LIMITED')
    expect(Number(limited.headers.get('retry-after'))).toBeGreaterThan(0)
  })

  it('rejects insufficient credits without leaving a reservation or calling the Service', async () => {
    const response = await fetch(`${gatewayBaseURL}/v1/yiyan?type=a&id=a1`, {
      headers: { 'x-api-key': poorApiKey }
    })
    const body = await readPublicEnvelope(response)

    expect(response.status).toBe(402)
    expect(body.code).toBe('INSUFFICIENT_CREDITS')

    const user = await queryOne<{ credits: number }>(
      'select credits from users where id = $1',
      [poorUserId]
    )
    const reservations = await queryOne<{ count: number }>(
      'select count(*)::int as count from api_credit_reservations where user_id = $1',
      [poorUserId]
    )
    const rejection = await queryOne<{
      error_code: string
      is_counted: boolean
    }>(
      'select error_code, is_counted from api_calls where route_id = $1 and user_id = $2 order by id desc limit 1',
      [routeIds.yiyan, poorUserId]
    )

    expect(user.credits).toBe(1)
    expect(reservations.count).toBe(0)
    expect(rejection).toEqual({
      error_code: 'INSUFFICIENT_CREDITS',
      is_counted: false
    })
  })
})

async function createRoute(input: {
  apiVersionId: string
  upstreamServiceId: string
  name: string
  method?: 'GET' | 'POST'
  pathPattern: string
  upstreamPathTemplate: string
  isApiKey?: boolean
  isStatistics?: boolean
  creditsCost?: number
  maxResponseBytes?: number
  rateLimitPerMinute?: number
}): Promise<string> {
  const route = await platformRouteService.create({
    apiVersionId: input.apiVersionId,
    name: input.name,
    hosts: [],
    method: input.method ?? 'GET',
    pathPattern: input.pathPattern,
    upstreamServiceId: input.upstreamServiceId,
    upstreamPathTemplate: input.upstreamPathTemplate,
    isApiKey: input.isApiKey ?? false,
    isStatistics: input.isStatistics ?? true,
    creditsCost: input.creditsCost ?? 0,
    rateLimitPerSecond: 0,
    rateLimitPerMinute: input.rateLimitPerMinute ?? 0,
    rateLimitPerHour: 0,
    rateLimitPerDay: 0,
    timeoutMs: 5_000,
    maxRequestBytes: 0,
    maxResponseBytes: input.maxResponseBytes ?? 512 * 1024,
    state: 'active'
  })
  if (!route) throw new Error(`route was not created: ${input.pathPattern}`)
  return route.id
}

function lifecycleRouteInput(pathPattern: string) {
  return {
    apiVersionId: officialVersionId,
    name: 'Route 生命周期验收',
    hosts: [],
    method: 'GET' as const,
    pathPattern,
    upstreamServiceId: officialUpstreamId,
    upstreamPathTemplate: '/v1/yiyan',
    isApiKey: false,
    isStatistics: false,
    creditsCost: 0,
    rateLimitPerSecond: 0,
    rateLimitPerMinute: 0,
    rateLimitPerHour: 0,
    rateLimitPerDay: 0,
    timeoutMs: 5_000,
    maxRequestBytes: 0,
    maxResponseBytes: 512 * 1024,
    state: 'active' as const
  }
}

interface PublicEnvelope<T = unknown> {
  code: string
  message: string
  data: T | null
  timestamp: number
}

async function readPublicEnvelope<T = unknown>(
  response: Response
): Promise<PublicEnvelope<T>> {
  const body = await response.json() as PublicEnvelope<T>
  expect(Object.keys(body).sort()).toEqual(['code', 'data', 'message', 'timestamp'])
  expect(typeof body.code).toBe('string')
  expect(typeof body.message).toBe('string')
  expect(Object.hasOwn(body, 'data')).toBe(true)
  expect(Number.isSafeInteger(body.timestamp)).toBe(true)
  expect(body.timestamp).toBeGreaterThan(0)
  expect(body.timestamp).toBeLessThanOrEqual(Date.now())
  expect(response.headers.get('content-type')).toContain('application/json')
  expect(response.headers.get('cache-control')).toBe('no-store')
  expect(response.headers.get('x-request-id')).toBeTruthy()
  return body
}

async function countCalls(routeId: string): Promise<number> {
  return (await queryOne<{ count: number }>(
    'select count(*)::int as count from api_calls where route_id = $1',
    [routeId]
  )).count
}

async function queryOne<T extends Record<string, unknown>>(
  statement: string,
  parameters: unknown[] = []
): Promise<T> {
  if (!databaseClient) throw new Error('acceptance database is not ready')
  const result = await databaseClient.query<T>(statement, parameters)
  const row = result.rows[0]
  if (!row) throw new Error(`query returned no row: ${statement}`)
  return row
}

async function waitUntilReady(
  processHandle: ChildProcess,
  serviceBaseURL: string
) {
  const deadline = Date.now() + 5_000
  while (Date.now() < deadline) {
    if (hasExited(processHandle)) {
      throw new Error(
        `API Service exited before ready.\n${serviceOutput}\n${serviceErrorOutput}`
      )
    }
    try {
      const response = await fetch(`${serviceBaseURL}/readyz`, {
        signal: AbortSignal.timeout(500)
      })
      if (response.ok && (await response.json()).status === 'ready') {
        return
      }
    } catch {
      // The socket is expected to refuse connections during startup.
    }
    await delay(50)
  }
  throw new Error(
    `API Service did not become ready.\n${serviceOutput}\n${serviceErrorOutput}`
  )
}

async function reservePort(): Promise<number> {
  const server = createServer()
  const port = await listen(server)
  await closeServer(server)
  return port
}

function listen(server: Server): Promise<number> {
  return new Promise((resolvePromise, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject)
      const address = server.address()
      if (!address || typeof address === 'string') {
        reject(new Error('server did not expose a TCP port'))
        return
      }
      resolvePromise(address.port)
    })
  })
}

function closeServer(server: Server): Promise<void> {
  return new Promise((resolvePromise, reject) => {
    server.close((error) => {
      if (error) {
        reject(error)
        return
      }
      resolvePromise()
    })
  })
}

async function stopChild(processHandle: ChildProcess): Promise<void> {
  if (hasExited(processHandle)) {
    return
  }
  const gracefulExit = new Promise<void>((resolvePromise) => {
    processHandle.once('exit', () => resolvePromise())
  })
  processHandle.kill('SIGTERM')
  await Promise.race([gracefulExit, delay(3_000)])
  if (!hasExited(processHandle)) {
    const forcedExit = new Promise<void>((resolvePromise) => {
      processHandle.once('exit', () => resolvePromise())
    })
    processHandle.kill('SIGKILL')
    await Promise.race([forcedExit, delay(2_000)])
  }
  if (!hasExited(processHandle)) {
    throw new Error('API Service acceptance process did not stop')
  }
}

function hasExited(processHandle: ChildProcess): boolean {
  return (
    processHandle.exitCode !== null
    || processHandle.signalCode !== null
  )
}

function delay(milliseconds: number): Promise<void> {
  return new Promise(resolvePromise => setTimeout(resolvePromise, milliseconds))
}

function keepTail(value: string): string {
  return value.slice(-16_384)
}
