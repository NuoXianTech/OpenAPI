/**
 * 示例 · POST /v1/test
 *
 * 演示 body 回显，并展示业务标记失败的用法（用于避免错误扣费）。
 *
 * 计费规则：
 *   - admin 在 apis.costCredits 设置 > 0 后，调用必须带 apiKey；
 *   - 调用 finish 时按 statusCode 判定成功/失败；
 *   - 业务侧若需要更细粒度判定（如 statusCode=200 但业务失败），
 *     调用 markApiCallFailed(event, code?, msg?) 跳过扣费。
 */

import type { H3Event } from 'h3'
import { readBody } from 'h3'
import { markApiCallFailed } from '~~/server/utils/apiCallOutcome'
import { openApiFail, openApiOk } from '~~/server/utils/openApiResponse'
import { OPEN_API_CODE } from '~~/shared/config/openApiCodes'

export default defineEventHandler(async (event: H3Event) => {
  const body = await readBody(event).catch(() => null)

  // 示例：body 中带 simulateFailure=true 时，模拟一次"业务失败"
  // 此时即便 HTTP 200 也不会扣费，且 apiCalls.errorCode/errorMessage 会记录
  if (body && typeof body === 'object' && (body as Record<string, unknown>).simulateFailure) {
    markApiCallFailed(event, 'SIMULATED_FAILURE', '业务侧主动标记失败，不扣费')
    return openApiFail(event, OPEN_API_CODE.BUSINESS_FAILED, '业务失败（演示）')
  }

  return openApiOk(event, {
    echo: body ?? null,
    apiKeyId: event.context.apiKey?.id ?? null,
  })
})
