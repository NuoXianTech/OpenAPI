import type { H3Event } from 'h3'
import { createError, getQuery, readRawBody, readValidatedBody } from 'h3'
import { ZodError } from 'zod'
import type { z } from 'zod'

export const MAX_ZOD_BODY_BYTES = 10 * 1024 * 1024

const H3_RAW_BODY = Symbol.for('h3RawBody')
const H3_PARSED_BODY = Symbol.for('h3ParsedBody')

type RequestWithBodyCache = H3Event['node']['req'] & {
  rawBody?: unknown
  body?: unknown
  [key: symbol]: unknown
}

function payloadTooLarge(maxBodySize: number) {
  return createError({
    statusCode: 413,
    statusMessage: 'Payload Too Large',
    message: `Request body exceeds ${maxBodySize} bytes`
  })
}

function assertBodySize(body: Buffer | undefined, maxBodySize: number): void {
  if (body && body.byteLength > maxBodySize) throw payloadTooLarge(maxBodySize)
}

function readNodeBodyWithLimit(event: H3Event, maxBodySize: number): Promise<Buffer> {
  const request = event.node.req

  return new Promise((resolve, reject) => {
    if (request.readableEnded) {
      resolve(Buffer.alloc(0))
      return
    }

    const chunks: Buffer[] = []
    let receivedBytes = 0

    const cleanup = () => {
      request.off('data', onData)
      request.off('end', onEnd)
      request.off('error', onError)
      request.off('aborted', onAborted)
    }
    const onData = (chunk: Buffer | Uint8Array | string) => {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
      receivedBytes += buffer.byteLength
      if (receivedBytes > maxBodySize) {
        cleanup()
        // Drain the remainder without retaining it so Nitro can still send 413.
        request.resume()
        reject(payloadTooLarge(maxBodySize))
        return
      }
      chunks.push(buffer)
    }
    const onEnd = () => {
      cleanup()
      resolve(Buffer.concat(chunks, receivedBytes))
    }
    const onError = (error: Error) => {
      cleanup()
      reject(error)
    }
    const onAborted = () => {
      cleanup()
      reject(new Error('Request body stream was aborted'))
    }

    request.on('data', onData)
    request.on('end', onEnd)
    request.on('error', onError)
    request.on('aborted', onAborted)
  })
}

async function enforceBodySizeWhileReading(event: H3Event, maxBodySize: number): Promise<void> {
  const request = event.node.req as RequestWithBodyCache
  if (request[H3_PARSED_BODY] !== undefined) return

  const eventRequestBody = (event as H3Event & { _requestBody?: unknown })._requestBody
  const hasExistingBody = eventRequestBody
    || event.web?.request?.body
    || request[H3_RAW_BODY]
    || request.rawBody
    || request.body
  if (hasExistingBody) {
    assertBodySize(await readRawBody(event, false), maxBodySize)
    return
  }

  const rawBody = readNodeBodyWithLimit(event, maxBodySize)
  request[H3_RAW_BODY] = rawBody
  await rawBody
}

function badRequest(error: ZodError): never {
  throw createError({
    statusCode: 400,
    message: error.issues[0]?.message ?? '请求参数有误',
    data: { issues: error.issues }
  })
}

/**
 * 用 zod schema 校验请求体；失败抛 400，message 取第一个 issue。
 * 与 h3 原生 readValidatedBody 签名对齐，仅在抛错时把 ZodError 翻译成 HTTP 错误。
 *
 * Control plane body size limit is enforced by the body-limit plugin.
 * This check is a defense-in-depth fallback.
 */
export async function readZodBody<S extends z.ZodType>(
  event: H3Event,
  schema: S
): Promise<z.output<S>> {
  try {
    // Check context body size limit set by plugin
    const maxBodySize = event.context.__maxBodySize ?? MAX_ZOD_BODY_BYTES
    const contentLength = event.node.req.headers['content-length']
    if (contentLength) {
      const length = Number.parseInt(contentLength, 10)
      if (Number.isFinite(length) && length > maxBodySize) {
        throw payloadTooLarge(maxBodySize)
      }
    }

    await enforceBodySizeWhileReading(event, maxBodySize)
    return await readValidatedBody(event, body => schema.parse(body))
  } catch (error) {
    if (error instanceof ZodError) badRequest(error)
    throw error
  }
}

/**
 * 用 zod schema 校验查询参数；失败抛 400。
 * 不要用 safeParse 静默回退成「不过滤」——那会让一个拼错的过滤条件
 * 返回全部行，既是越权也让前端拿到无声的错误数据。
 */
export function parseZodQuery<S extends z.ZodType>(
  event: H3Event,
  schema: S
): z.output<S> {
  try {
    return schema.parse(getQuery(event))
  } catch (error) {
    if (error instanceof ZodError) badRequest(error)
    throw error
  }
}
