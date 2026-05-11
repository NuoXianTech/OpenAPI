import type { H3Event } from 'h3'
import { createError, readValidatedBody } from 'h3'
import { ZodError } from 'zod'
import type { z } from 'zod'

/**
 * 用 zod schema 校验请求体；失败抛 400，message 取第一个 issue。
 * 与 h3 原生 readValidatedBody 签名对齐，仅在抛错时把 ZodError 翻译成 HTTP 错误。
 */
export async function readZodBody<S extends z.ZodType>(
  event: H3Event,
  schema: S,
): Promise<z.output<S>> {
  try {
    return await readValidatedBody(event, body => schema.parse(body))
  }
  catch (error) {
    if (error instanceof ZodError) {
      throw createError({
        statusCode: 400,
        message: error.issues[0]?.message ?? 'Invalid request body',
        data: { issues: error.issues },
      })
    }
    throw error
  }
}
