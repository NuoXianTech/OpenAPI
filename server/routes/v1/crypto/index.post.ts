/**
 * POST /v1/crypto · 使用统一请求体执行加密、解密或编码转换。
 *
 * Body:
 *   {
 *     algorithm: 'caesar',
 *     action: 'encode',
 *     input: 'Hello',
 *     key?: '统一密钥字段',
 *     options?: { shift: 3 }
 *   }
 */

import type { H3Event } from 'h3'
import { ensureCryptoRegistered } from '~~/server/lib/crypto'
import { isCryptoAlgorithmEnabled } from '~~/server/lib/crypto/capability-config'
import { parseCryptoRequestBody, toCryptoMode } from '~~/server/lib/crypto/request'
import { getAlgorithm, normalizeOptions } from '~~/server/lib/crypto/registry'
import { isCryptoBusinessError } from '~~/server/lib/crypto/types'
import { openApiBizFail } from '~~/server/utils/api-call-outcome'
import { openApiFail, openApiOk } from '~~/server/utils/open-api-response'
import { readOpenApiJsonBody } from '~~/server/utils/zod'

function failBusiness(event: H3Event, message: string, bizCode = 'CRYPTO_FAILED') {
  return openApiBizFail(event, 422, bizCode, message)
}

export default defineOpenApiEventHandler(async (event: H3Event) => {
  const body = await readOpenApiJsonBody(event)
  const parsed = parseCryptoRequestBody(body)
  if (!parsed.ok) return openApiFail(event, 400, parsed.code, parsed.message)

  ensureCryptoRegistered()
  const request = parsed.data
  const algorithm = getAlgorithm(request.algorithm)
  if (!algorithm) {
    return openApiFail(event, 404, 'ALGORITHM_NOT_FOUND', `未知算法 "${request.algorithm}"，请通过 GET /v1/crypto 查看可用列表`)
  }
  if (!await isCryptoAlgorithmEnabled(algorithm.name)) {
    return openApiFail(event, 403, 'CRYPTO_ALGORITHM_DISABLED', `算法 "${algorithm.name}" 已被管理员关闭`)
  }
  const mode = toCryptoMode(request.action)
  if (!algorithm.modes.includes(mode)) {
    return openApiFail(
      event,
      422,
      'UNSUPPORTED_ACTION',
      `算法 "${algorithm.name}" 不支持 ${request.action} 操作`
    )
  }

  const rawOptions = {
    ...request.options,
    ...(request.key !== undefined ? { key: request.key } : {})
  }

  let options: Record<string, unknown>
  try {
    options = normalizeOptions(algorithm.options, mode, rawOptions)
  } catch (error) {
    if (isCryptoBusinessError(error)) return failBusiness(event, error.message, error.bizCode)
    throw error
  }

  try {
    const result = await algorithm.exec({ mode, text: request.input, options })
    return openApiOk(event, {
      result: result.text
    }, '处理成功')
  } catch (error) {
    if (isCryptoBusinessError(error)) return failBusiness(event, error.message, error.bizCode)
    const message = error instanceof Error ? error.message : '处理失败'
    return failBusiness(event, message)
  }
})
