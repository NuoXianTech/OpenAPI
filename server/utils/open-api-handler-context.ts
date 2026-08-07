import type { H3Event } from 'h3'
import { getQuery, getRequestHeader, getRequestURL, getRouterParams, setResponseHeaders } from 'h3'
import type { ApiKeyContext } from '~~/server/types/api-guard'
import { openApiBizFail } from '~~/server/utils/api-call-outcome'
import {
  openApiFail,
  openApiOk,
  openApiRespond,
  openApiRaw,
  openApiRedirect,
  type OpenApiRespondOptions,
  type OpenApiRespondResult,
  type OpenApiRawResponseOptions,
  type OpenApiResponse
} from '~~/server/utils/open-api-response'
import { ensureRequestId } from '~~/server/utils/request-id'
import { getAppEventContext } from '~~/server/utils/event-context'
import { readClientIp } from '~~/server/utils/request-meta'
import { readOpenApiJsonBody } from '~~/server/utils/zod'

export interface OpenApiHandlerContext {
  signal: AbortSignal
  url: URL
  header(name: string): string | undefined
  setHeaders(headers: Record<string, string>): void
  query: Record<string, unknown>
  params: Record<string, string>
  clientIp: string | null
  apiKey: ApiKeyContext | null
  requestId: string
  readBody<T = unknown>(maxBytes?: number): Promise<T | undefined>
  ok<T>(data: T, message?: string): OpenApiResponse<T>
  fail(status: number, code: string, message: string, data?: unknown): OpenApiResponse
  businessFail(status: number, code: string, message: string, data?: unknown): OpenApiResponse
  respond<T>(data: T, options?: OpenApiRespondOptions<T>): OpenApiRespondResult<T>
  raw<T>(body: T, options: OpenApiRawResponseOptions): T
  redirect(location: string, status?: number): ReturnType<typeof openApiRedirect>
}

export function createOpenApiHandlerContext(
  event: H3Event,
  signal: AbortSignal
): OpenApiHandlerContext {
  const query = getQuery(event) as Record<string, unknown>
  const eventContext = getAppEventContext(event)
  return {
    signal,
    url: getRequestURL(event),
    header: name => getRequestHeader(event, name) || undefined,
    setHeaders: headers => setResponseHeaders(event, headers),
    query,
    params: getRouterParams(event),
    clientIp: readClientIp(event),
    apiKey: eventContext.apiKey ?? null,
    requestId: ensureRequestId(event),
    readBody: <T>(maxBytes?: number) => readOpenApiJsonBody(event, maxBytes) as Promise<T | undefined>,
    ok: (data, message) => openApiOk(event, data, message),
    fail: (status, code, message, data) => openApiFail(event, status, code, message, data),
    businessFail: (status, code, message, data) => openApiBizFail(event, status, code, message, data),
    respond: (data, options) => openApiRespond(event, query, data, options),
    raw: (body, options) => openApiRaw(event, body, options),
    redirect: (location, status) => openApiRedirect(event, location, status)
  }
}
