import type { H3Event } from 'h3'
import { createError, getHeader, getQuery, getRequestIP } from 'h3'
import { apiService } from '~~/server/service/apiService'
import { apiCallService } from '~~/server/service/apiCallService'
import { apiCallStatsService } from '~~/server/service/apiCallStatsService'
import { apiKeyService } from '~~/server/service/apiKeyService'

export default defineEventHandler(async (event: H3Event) => {
  const startedAt = Date.now()
  const testApiId = 'test_statistics_demo'

  const existingApi = await apiService.getByApiId(testApiId)
  const createdApi = existingApi ? null : await apiService.addApi(null, {
    apiId: testApiId,
    name: '调用统计测试接口',
    shortDesc: '用于验证调用统计链路',
    description: '这是一个自动创建的测试接口，用来演示启用统计时的完整写入流程。',
    httpMethod: 'GET',
    apiPath: '/api/v1/test',
    docUrl: '/api/v1/test',
    isEnabled: true,
    isApiKey: true,
    isStatistics: true,
    rateLimitPerMinute: 0,
  })
  const api = existingApi || createdApi?.[0]

  if (api && !api.isApiKey) {
    await apiService.updateApi(api.id, null, { isApiKey: true })
    api.isApiKey = true
  }

  if (!api) {
    throw createError({ statusCode: 404, message: 'api not found' })
  }

  const query = getQuery(event)
  const apiKey = (query.apiKey || getHeader(event, 'x-api-key') || '').toString().trim()

  if (api.isApiKey && !apiKey) {
    return {
      code: 401,
      msg: 'need api key',
      data: { needApiKey: true, allowed: false },
    }
  }

  if (api.isApiKey) {
    const matchedKey = await apiKeyService.getByApiKey(apiKey)
    if (!matchedKey || !matchedKey.isActive) {
      return {
        code: 401,
        msg: 'invalid api key',
        data: { needApiKey: true, allowed: false, valid: false },
      }
    }
  }

  let callId: number | null = null

  if (api.isStatistics) {
    const call = await apiCallService.addCall({
      apiId: api.id,
      apiKeyId: null,
      userId: null,
      path: event.path,
      method: event.method,
      statusCode: 200,
      latencyMs: Math.max(Date.now() - startedAt, 0),
      ip: getRequestIP(event) || null,
      requestSize: null,
      responseSize: null,
      rawRequest: null,
    })
    callId = call[0]?.id ?? null

    await apiCallStatsService.upsertDailyStat({
      apiId: api.id,
      apiCallId: callId,
      statDate: new Date(),
      totalCount: 1,
      successCount: 1,
      failureCount: 0,
      apiPath: event.path,
    })
  }

  return {
    code: 0,
    msg: 'ok',
    data: {
      message: '测试接口调用成功！',
      apiId: api.id,
      statisticsEnabled: api.isStatistics,
      callId,
    },
  }
})
