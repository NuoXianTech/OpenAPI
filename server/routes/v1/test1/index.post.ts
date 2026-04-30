/**
 * 示例 · POST /v1/test1
 *
 * 演示 body 回显，用于验证限流/统计。
 */

import type { H3Event } from 'h3'
import { readBody } from 'h3'
import { report } from '~~/server/utils/report'

export default defineEventHandler(async (event: H3Event) => {
  const body = await readBody(event).catch(() => null)
  return report(event, 200, 'ok', {
    echo: body ?? null,
    apiKeyId: event.context.apiKey?.id ?? null,
  })
})
