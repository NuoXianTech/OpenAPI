/**
 * GET /v1/crypto · 列出所有可用的加/解密算法。
 *
 * 只返回调用方真正需要的简介和请求示例；内部选项定义不对外暴露。
 */

import type { H3Event } from 'h3'
import { openApiOk } from '~~/server/utils/open-api-response'
import { ensureCryptoRegistered } from '~~/server/lib/crypto'
import { toPublicCryptoAlgorithm } from '~~/server/lib/crypto/catalog'
import { listAlgorithms } from '~~/server/lib/crypto/registry'
import { getEnabledCryptoAlgorithmNames } from '~~/server/lib/crypto/capability-config'

export default defineOpenApiEventHandler(async (event: H3Event) => {
  ensureCryptoRegistered()
  const enabledAlgorithmNames = await getEnabledCryptoAlgorithmNames()
  const algorithms = listAlgorithms()
    .filter(algorithm => enabledAlgorithmNames.has(algorithm.name))
    .map(toPublicCryptoAlgorithm)

  return openApiOk(event, {
    items: algorithms
  }, '获取算法列表成功')
})
