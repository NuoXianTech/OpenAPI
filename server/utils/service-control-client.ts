import type { z } from 'zod'
import {
  openapiDocumentSchema,
  redactedServiceConfigurationStateSchema,
  serviceConfigurationDefinitionSchema,
  serviceConfigurationUpdateResponseSchema,
  serviceDescriptionSchema
} from '#shared/service-control'
import { readLimitedText } from '~~/server/utils/safe-fetch'

const CONTROL_TIMEOUT_MS = 10_000
const MAX_CONTROL_RESPONSE_BYTES = 4 * 1024 * 1024
const MAX_CONTROL_ERROR_BYTES = 64 * 1024
const SERVICE_ERROR_CODE_PATTERN = /^[A-Z][A-Z0-9_]{0,79}$/

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

function normalizedErrorCode(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const code = value.trim()
  return SERVICE_ERROR_CODE_PATTERN.test(code) ? code : null
}

function normalizedErrorMessage(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const message = value.trim().replace(/\s+/g, ' ')
  return message ? message.slice(0, 500) : null
}

async function describeErrorResponse(response: Response): Promise<string | null> {
  const headerCode = normalizedErrorCode(
    response.headers.get('x-openapi-error-code')
  )
  let raw: string
  try {
    raw = await readLimitedText(response, MAX_CONTROL_ERROR_BYTES)
  } catch {
    return headerCode ? `[${headerCode}]` : null
  }

  let body: unknown
  try {
    body = JSON.parse(raw)
  } catch {
    return headerCode ? `[${headerCode}]` : null
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return headerCode ? `[${headerCode}]` : null
  }

  const record = body as Record<string, unknown>
  const code = normalizedErrorCode(record.code) ?? headerCode
  const message = normalizedErrorMessage(record.message)
  if (code && message) return `[${code}] ${message}`
  if (code) return `[${code}]`
  return message
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
    const detail = await describeErrorResponse(response)
    throw new ServiceControlRequestError(
      response.status,
      endpoint,
      `service control request returned HTTP ${response.status}${
        detail ? `: ${detail}` : ''
      }`
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
