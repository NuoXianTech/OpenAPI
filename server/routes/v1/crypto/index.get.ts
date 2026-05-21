/**
 * GET /v1/crypto · 列出所有可用的加/解密算法。
 *
 * 返回 name / title / description / modes / params，
 * 前端可据此动态渲染算法选择列表与参数表单。
 */

import type { H3Event } from 'h3'
import { openApiOk } from '~~/server/utils/openApiResponse'
import { ensureCryptoRegistered } from '~~/server/lib/crypto'
import { listAlgorithms } from '~~/server/lib/crypto/registry'

export default defineEventHandler((event: H3Event) => {
  ensureCryptoRegistered()
  const algorithms = listAlgorithms().map(algo => ({
    name: algo.name,
    title: algo.title,
    description: algo.description,
    needsKey: algo.needsKey ?? false,
    modes: algo.modes,
    params: algo.params ?? []
  }))

  return openApiOk(event, {
    total: algorithms.length,
    items: algorithms
  }, '获取算法列表成功')
})
