/**
 * POST /v1/crypto/{name} · 执行指定算法的加/解密。
 *
 * Body:
 *   {
 *     mode: 'encrypt' | 'decrypt',
 *     text: string,                    // 待处理的明文 / 密文
 *     ...其他算法专属参数（详见 GET /v1/crypto）
 *   }
 *
 * 状态码：
 *   - 400 MISSING_PARAMETER / INVALID_REQUEST_BODY / INVALID_PARAMETER —— 请求格式问题
 *   - 404 ALGORITHM_NOT_FOUND —— 未知算法名
 *   - 422 UNSUPPORTED_MODE / CRYPTO_FAILED ... —— mode 非法 / 参数语义校验失败 / 加解密执行失败（业务侧）
 *   - 500 算法 exec 抛非业务异常（统一兜底）
 *
 * 422 路径同时 markApiCallFailed，把可读 bizCode（CRYPTO_FAILED 等）写入调用日志。
 * 4xx/5xx 默认跳过扣费，无需额外标记。
 */

import type { H3Event } from 'h3'
import { getRouterParam, readBody } from 'h3'
import { openApiBizFail } from '~~/server/utils/api-call-outcome'
import { openApiFail, openApiOk } from '~~/server/utils/open-api-response'
import {
  isCryptoBusinessError,
  type CryptoMode
} from '~~/server/lib/crypto/types'
import { ensureCryptoRegistered } from '~~/server/lib/crypto'
import { getAlgorithm, normalizeParams } from '~~/server/lib/crypto/registry'

function failBusiness(event: H3Event, message: string, bizCode = 'CRYPTO_FAILED') {
  return openApiBizFail(event, 422, bizCode, message)
}

export default defineEventHandler(async (event: H3Event) => {
  ensureCryptoRegistered()
  const name = (getRouterParam(event, 'name') || '').trim().toLowerCase()
  if (!name) {
    return openApiFail(event, 400, 'MISSING_PARAMETER', '缺少算法名')
  }
  const algorithm = getAlgorithm(name)
  if (!algorithm) {
    return openApiFail(event, 404, 'ALGORITHM_NOT_FOUND', `未知算法 "${name}"，请通过 GET /v1/crypto 查看可用列表`)
  }

  const body = (await readBody(event).catch(() => null)) as Record<string, unknown> | null
  if (!body || typeof body !== 'object') {
    return openApiFail(event, 400, 'INVALID_REQUEST_BODY', '请求体必须是 JSON 对象')
  }

  const mode = String(body.mode || '').toLowerCase() as CryptoMode
  if (!algorithm.modes.includes(mode)) {
    return openApiFail(
      event,
      422,
      'UNSUPPORTED_MODE',
      `算法 "${name}" 仅支持 ${algorithm.modes.join(' / ')}，当前 mode=${body.mode ?? '<空>'}`
    )
  }

  const text = body.text
  if (typeof text !== 'string') {
    return openApiFail(event, 400, 'INVALID_PARAMETER', '参数 text 必须是字符串')
  }

  let params: Record<string, unknown>
  try {
    params = normalizeParams(algorithm.params, mode, body)
  } catch (err) {
    if (isCryptoBusinessError(err)) return failBusiness(event, err.message, err.bizCode)
    throw err
  }

  try {
    const result = await algorithm.exec({ mode, text, params })
    return openApiOk(
      event,
      {
        name: algorithm.name,
        mode,
        text: result.text,
        ...(result.meta ? { meta: result.meta } : {})
      },
      mode === 'encrypt' ? '加密成功' : '解密成功'
    )
  } catch (err) {
    if (isCryptoBusinessError(err)) return failBusiness(event, err.message, err.bizCode)
    const message = err instanceof Error ? err.message : '加/解密执行失败'
    return failBusiness(event, message)
  }
})
