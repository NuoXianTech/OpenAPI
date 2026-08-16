import type { z } from 'zod'
import {
  openapiDocumentSchema,
  redactedServiceConfigurationStateSchema,
  serviceConfigurationDefinitionSchema,
  serviceConfigurationUpdateResponseSchema,
  serviceDescriptionSchema
} from '~~/server/schemas/service-control'
import { readLimitedText } from '~~/server/utils/safe-fetch'

const CONTROL_TIMEOUT_MS = 10_000
const MAX_CONTROL_RESPONSE_BYTES = 4 * 1024 * 1024

export class ServiceControlRequestError extends Error {
  constructor(
    readonly status: number | null,
    readonly endpoint: string,
    message: string
  ) {
    super(message)
    this.name = 'ServiceControlRequestError'
  }
}

export function buildServiceControlUrl(
  baseUrl: string,
  endpoint: string
): URL {
  const base = new URL(baseUrl)
  const endpointUrl = new URL(endpoint, 'http://service.invalid')
  const basePath = base.pathname === '/'
    ? ''
    : base.pathname.replace(/\/$/, '')
  base.pathname = `${basePath}${endpointUrl.pathname}` || '/'
  base.search = endpointUrl.search
  base.hash = ''
  return base
}

async function requestJson<TSchema extends z.ZodType>(
  baseUrl: string,
  endpoint: string,
  token: string,
  schema: TSchema,
  init: RequestInit = {}
): Promise<{
  data: z.output<TSchema>
  headers: Headers
  url: string
}> {
  const url = buildServiceControlUrl(baseUrl, endpoint)
  const headers = new Headers(init.headers)
  headers.set('authorization', `Service ${token}`)
  headers.set('accept', 'application/json')
  if (init.body) headers.set('content-type', 'application/json')

  let response: Response
  try {
    response = await fetch(url, {
      ...init,
      headers,
      redirect: 'manual',
      signal: AbortSignal.timeout(CONTROL_TIMEOUT_MS)
    })
  } catch (error) {
    throw new ServiceControlRequestError(
      null,
      endpoint,
      `service control request failed: ${
        error instanceof Error ? error.name : 'network error'
      }`
    )
  }

  if (!response.ok) {
    await response.body?.cancel().catch(() => undefined)
    throw new ServiceControlRequestError(
      response.status,
      endpoint,
      `service control request returned HTTP ${response.status}`
    )
  }
  const raw = await readLimitedText(response, MAX_CONTROL_RESPONSE_BYTES)
  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch {
    throw new ServiceControlRequestError(
      response.status,
      endpoint,
      'service control response is not valid JSON'
    )
  }
  const parsed = schema.safeParse(json)
  if (!parsed.success) {
    const issues = parsed.error.issues
      .slice(0, 5)
      .map((issue) => {
        const path = issue.path.length > 0
          ? issue.path.join('.')
          : '<root>'
        return `${path}: ${issue.message}`
      })
      .join('; ')
    throw new ServiceControlRequestError(
      response.status,
      endpoint,
      `service control response does not match the protocol: ${issues}`
    )
  }
  return { data: parsed.data, headers: response.headers, url: url.toString() }
}

export const serviceControlClient = {
  getDescription(baseUrl: string, token: string) {
    return requestJson(
      baseUrl,
      '/.well-known/service.json',
      token,
      serviceDescriptionSchema
    )
  },

  getConfigurationDefinition(
    baseUrl: string,
    endpoint: string,
    token: string
  ) {
    return requestJson(
      baseUrl,
      endpoint,
      token,
      serviceConfigurationDefinitionSchema
    )
  },

  getConfigurationState(
    baseUrl: string,
    endpoint: string,
    token: string
  ) {
    return requestJson(
      baseUrl,
      endpoint,
      token,
      redactedServiceConfigurationStateSchema
    )
  },

  getOpenAPI(baseUrl: string, endpoint: string, token: string) {
    return requestJson(
      baseUrl,
      endpoint,
      token,
      openapiDocumentSchema
    )
  },

  updateConfiguration(
    baseUrl: string,
    endpoint: string,
    token: string,
    input: {
      revision: number
      values: Record<string, unknown>
    }
  ) {
    return requestJson(
      baseUrl,
      endpoint,
      token,
      serviceConfigurationUpdateResponseSchema,
      {
        method: 'PUT',
        body: JSON.stringify({
          schemaVersion: 1,
          revision: input.revision,
          values: input.values
        })
      }
    )
  }
}
