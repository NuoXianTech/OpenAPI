/**
 * GET /v1/crypto · 列出所有可用的加/解密算法。
 *
 * 返回 name / title / description / modes / params，
 * 前端可据此动态渲染算法选择列表与参数表单。
 */

import type { H3Event } from 'h3'
import { openApiOk } from '~~/server/utils/open-api-response'
import { ensureCryptoRegistered } from '~~/server/lib/crypto'
import { listAlgorithms } from '~~/server/lib/crypto/registry'
import { getEnabledCryptoAlgorithmNames } from '~~/server/lib/crypto/capability-config'

export default defineOpenApiEventHandler(async (event: H3Event) => {
  ensureCryptoRegistered()
  const enabledAlgorithmNames = await getEnabledCryptoAlgorithmNames()
  const algorithms = listAlgorithms()
    .filter(algorithm => enabledAlgorithmNames.has(algorithm.name))
    .map(algorithm => ({
      name: algorithm.name,
      title: algorithm.title,
      description: algorithm.description,
      needsKey: algorithm.needsKey ?? false,
      modes: algorithm.modes,
      params: algorithm.params ?? []
    }))

  return openApiOk(event, {
    total: algorithms.length,
    items: algorithms
  }, '获取算法列表成功')
})
