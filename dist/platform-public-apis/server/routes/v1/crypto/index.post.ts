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

import { ensureCryptoRegistered } from '~~/server/lib/crypto'
import { isCryptoAlgorithmEnabled } from '~~/server/lib/crypto/capability-config'
import { parseCryptoRequestBody, toCryptoMode } from '~~/server/lib/crypto/request'
import { getAlgorithm, normalizeOptions } from '~~/server/lib/crypto/registry'
import { isCryptoBusinessError } from '~~/server/lib/crypto/types'
import type { OpenApiHandlerContext } from '~~/server/utils/open-api-handler-context'

function failBusiness(api: OpenApiHandlerContext, message: string, bizCode = 'CRYPTO_FAILED') {
  return api.businessFail(422, bizCode, message)
}

export default defineOpenApiEventHandler(async (_event, api) => {
  const body = await api.readBody()
  const parsed = parseCryptoRequestBody(body)
  if (!parsed.ok) return api.fail(400, parsed.code, parsed.message)

  ensureCryptoRegistered()
  const request = parsed.data
  const algorithm = getAlgorithm(request.algorithm)
  if (!algorithm) {
    return api.fail(404, 'ALGORITHM_NOT_FOUND', `未知算法 "${request.algorithm}"，请通过 GET /v1/crypto 查看可用列表`)
  }
  if (!await isCryptoAlgorithmEnabled(algorithm.name)) {
    return api.fail(403, 'CRYPTO_ALGORITHM_DISABLED', `算法 "${algorithm.name}" 已被管理员关闭`)
  }
  const mode = toCryptoMode(request.action)
  if (!algorithm.modes.includes(mode)) {
    return api.fail(
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
    if (isCryptoBusinessError(error)) return failBusiness(api, error.message, error.bizCode)
    throw error
  }

  try {
    const result = await algorithm.exec({ mode, text: request.input, options })
    return api.ok({
      result: result.text
    }, '处理成功')
  } catch (error) {
    if (isCryptoBusinessError(error)) return failBusiness(api, error.message, error.bizCode)
    const message = error instanceof Error ? error.message : '处理失败'
    return failBusiness(api, message)
  }
})
