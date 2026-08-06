import type { H3Event } from 'h3'
import { createError, readBody, readValidatedBody } from 'h3'
import { ZodError } from 'zod'
import type { z } from 'zod'
import { openApiFail, type OpenApiResponse } from '~~/server/utils/open-api-response'

const OPEN_API_BODY_LIMIT_BYTES = 256 * 1024
const RAW_BODY_SYMBOL = Symbol.for('h3RawBody')

async function readLimitedRawBody(event: H3Event, maxBytes: number): Promise<Buffer | undefined> {
  const request = event.node.req
  const declaredLength = Number(request.headers['content-length'])
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw createError({ statusCode: 413, message: '请求体过大' })
  }

  const preloaded = Reflect.get(request, RAW_BODY_SYMBOL) ?? Reflect.get(request, 'rawBody')
  if (preloaded !== undefined) {
    const value = await Promise.resolve(preloaded)
    const body = Buffer.isBuffer(value)
      ? value
      : Buffer.from(typeof value === 'string' ? value : JSON.stringify(value))
    if (body.length > maxBytes) throw createError({ statusCode: 413, message: '请求体过大' })
    return body
  }

  if (!declaredLength && !/\bchunked\b/i.test(String(request.headers['transfer-encoding'] ?? ''))) {
    return undefined
  }

  const body = new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = []
    let total = 0
    let settled = false
    const cleanup = () => {
      request.off('data', onData)
      request.off('end', onEnd)
      request.off('error', onError)
    }
    const failTooLarge = () => {
      if (settled) return
      settled = true
      cleanup()
      request.resume()
      reject(createError({ statusCode: 413, message: '请求体过大' }))
    }
    const onData = (chunk: Buffer | string) => {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
      total += buffer.length
      if (total > maxBytes) {
        failTooLarge()
        return
      }
      chunks.push(buffer)
    }
    const onEnd = () => {
      if (settled) return
      settled = true
      cleanup()
      resolve(Buffer.concat(chunks, total))
    }
    const onError = (error: Error) => {
      if (settled) return
      settled = true
      cleanup()
      reject(error)
    }
    request.on('data', onData)
    request.on('end', onEnd)
    request.on('error', onError)
  })
  Reflect.set(request, RAW_BODY_SYMBOL, body)
  return body
}

export async function readOpenApiJsonBody(event: H3Event, maxBytes = OPEN_API_BODY_LIMIT_BYTES): Promise<unknown> {
  const body = await readLimitedRawBody(event, maxBytes)
  if (!body || body.length === 0) return undefined

  const contentType = String(event.node.req.headers['content-type'] || '')
  if (contentType.startsWith('text/')) return body.toString('utf8')
  if (contentType.startsWith('application/x-www-form-urlencoded')) {
    return Object.fromEntries(new URLSearchParams(body.toString('utf8')))
  }

  try {
    return JSON.parse(body.toString('utf8'))
  } catch {
    return undefined
  }
}

/**
 * 用 zod schema 校验请求体；失败抛 400，message 取第一个 issue。
 * 与 h3 原生 readValidatedBody 签名对齐，仅在抛错时把 ZodError 翻译成 HTTP 错误。
 */
export async function readZodBody<S extends z.ZodType>(
  event: H3Event,
  schema: S
): Promise<z.output<S>> {
  try {
    return await readValidatedBody(event, body => schema.parse(body))
  } catch (error) {
    if (error instanceof ZodError) {
      throw createError({
        statusCode: 400,
        message: error.issues[0]?.message ?? '请求参数有误',
        data: { issues: error.issues }
      })
    }
    throw error
  }
}

/** readOpenApiBody 的结果：成功携带类型安全 data，失败携带可直接 return 的标准壳响应 */
type OpenApiBodyResult<T>
  = | { ok: true, data: T }
    | { ok: false, response: OpenApiResponse }

/**
 * 对外接口（/v{N}/*）专用的 body 校验 · 复用 zod，但失败走 openApi 标准壳而非 H3 createError。
 *
 * 与 readZodBody 的分工：
 *   - readZodBody（后台内部接口 /api/**）：失败 throw createError，走 H3 默认错误格式。
 *   - readOpenApiBody（对外接口 /v{N}/**）：失败返回 { ok:false, response }，response 已是
 *     openApiFail 标准壳，满足对外契约「失败也是 {code,message,data,timestamp}、data 恒 null」。
 *
 * 用 early-return 守卫消费，收窄后 data 全程类型安全：
 * ```ts
 * import { z } from 'zod'
 * const BodySchema = z.object({ mode: z.enum(['encrypt', 'decrypt']), text: z.string() })
 *
 * const parsed = await readOpenApiBody(event, BodySchema)
 * if (!parsed.ok) return parsed.response          // 400 INVALID_REQUEST_BODY 标准壳
 * const { mode, text } = parsed.data              // 类型安全
 * ```
 *
 * code 默认 'INVALID_REQUEST_BODY'，可经 opts.code 覆盖；message 取 zod 第一个 issue
 * （全局 zhCN locale 下已是中文，见启动插件中的 z.config(z.locales.zhCN())）。
 */
export async function readOpenApiBody<S extends z.ZodType>(
  event: H3Event,
  schema: S,
  opts?: { code?: string }
): Promise<OpenApiBodyResult<z.output<S>>> {
  const raw = await readBody(event).catch(() => undefined)
  const result = schema.safeParse(raw)
  if (!result.success) {
    return {
      ok: false,
      response: openApiFail(
        event,
        400,
        opts?.code ?? 'INVALID_REQUEST_BODY',
        result.error.issues[0]?.message ?? '请求体校验失败'
      )
    }
  }
  return { ok: true, data: result.data }
}
