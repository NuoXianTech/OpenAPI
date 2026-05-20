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
 * 注意：未知算法名 → 40000 BAD_REQUEST；业务侧失败（密文损坏、参数越界等）
 * → 60000 BUSINESS_FAILED 且 markApiCallFailed 跳过扣费。
 */

import type { H3Event } from 'h3'
import { getRouterParam, readBody } from 'h3'
import { markApiCallFailed } from '~~/server/utils/apiCallOutcome'
import { openApiFail, openApiOk } from '~~/server/utils/openApiResponse'
import { OPEN_API_CODE } from '~~/shared/config/openApiCodes'
import {
  CryptoBusinessError,
  type CryptoMode
} from '~~/server/lib/crypto/types'
import { ensureCryptoRegistered } from '~~/server/lib/crypto'
import { getAlgorithm, normalizeParams } from '~~/server/lib/crypto/registry'

function failBusiness(event: H3Event, message: string, bizCode = 'CRYPTO_FAILED') {
  markApiCallFailed(event, bizCode, message)
  return openApiFail(event, OPEN_API_CODE.BUSINESS_FAILED, message)
}

export default defineEventHandler(async (event: H3Event) => {
  ensureCryptoRegistered()
  const name = (getRouterParam(event, 'name') || '').trim().toLowerCase()
  if (!name) {
    return openApiFail(event, OPEN_API_CODE.BAD_REQUEST, '缺少算法名')
  }
  const algorithm = getAlgorithm(name)
  if (!algorithm) {
    return openApiFail(event, OPEN_API_CODE.BAD_REQUEST, `未知算法 "${name}"，请通过 GET /v1/crypto 查看可用列表`)
  }

  const body = (await readBody(event).catch(() => null)) as Record<string, unknown> | null
  if (!body || typeof body !== 'object') {
    return openApiFail(event, OPEN_API_CODE.BAD_REQUEST, '请求体必须是 JSON 对象')
  }

  const mode = String(body.mode || '').toLowerCase() as CryptoMode
  if (!algorithm.modes.includes(mode)) {
    return openApiFail(
      event,
      OPEN_API_CODE.BAD_REQUEST,
      `算法 "${name}" 仅支持 ${algorithm.modes.join(' / ')}，当前 mode=${body.mode ?? '<空>'}`
    )
  }

  const text = body.text
  if (typeof text !== 'string') {
    return openApiFail(event, OPEN_API_CODE.BAD_REQUEST, '参数 text 必须是字符串')
  }

  let params: Record<string, unknown>
  try {
    params = normalizeParams(algorithm.params, mode, body)
  } catch (err) {
    if (err instanceof CryptoBusinessError) return failBusiness(event, err.message, err.bizCode)
    throw err
  }

  try {
    const result = await algorithm.exec({ mode, text, params })
    return openApiOk(event, {
      name: algorithm.name,
      mode,
      text: result.text,
      ...(result.meta ? { meta: result.meta } : {})
    })
  } catch (err) {
    if (err instanceof CryptoBusinessError) return failBusiness(event, err.message, err.bizCode)
    const message = err instanceof Error ? err.message : '加/解密执行失败'
    return failBusiness(event, message)
  }
})
