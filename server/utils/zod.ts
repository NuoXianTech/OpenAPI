import type { H3Event } from 'h3'
import { createError, getQuery, readValidatedBody } from 'h3'
import { ZodError } from 'zod'
import type { z } from 'zod'

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
 */
export async function readZodBody<S extends z.ZodType>(
  event: H3Event,
  schema: S
): Promise<z.output<S>> {
  try {
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
