import type { H3Event } from 'h3'
import { createError, getHeader, getQuery } from 'h3'
import { apiService } from '~~/server/service/apiService'
import { apiKeyService } from '~~/server/service/apiKeyService'

function isPgUniqueViolation(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === '23505'
}

function hasMethod(httpMethodList: string, method: 'GET' | 'POST') {
  return httpMethodList
    .split(',')
    .map(item => item.trim().toUpperCase())
    .includes(method)
}

async function ensureTestApi(code: string) {
  const existingApi = await apiService.getByCode(code)
  if (existingApi) {
    return existingApi
  }

  try {
    const created = await apiService.addApi(null, {
      code,
      name: '调用统计测试接口',
      shortDesc: '用于验证调用统计链路',
      description: '这是一个自动创建的测试接口，用来演示启用统计时的完整写入流程。',
      httpMethod: 'GET,POST',
      apiPath: '/api/v1/test',
      docUrl: '/api/v1/test',
      isEnabled: true,
      isApiKey: true,
      isStatistics: true,
      rateLimitPerMinute: 0,
    })
    return created[0] || null
  }
  catch (error) {
    if (isPgUniqueViolation(error)) {
      return apiService.getByCode(code)
    }
    throw error
  }
}

export default defineEventHandler(async (event: H3Event) => {
  const testApiCode = 'test_statistics_demo'
  let api = await ensureTestApi(testApiCode)
  if (api && (!api.isApiKey || !hasMethod(api.httpMethod, 'GET') || !hasMethod(api.httpMethod, 'POST'))) {
    api = await apiService.updateApi(api.id, null, {
      isApiKey: true,
      httpMethod: 'GET,POST',
    })
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

  return {
    code: 0,
    msg: 'ok',
    data: {
      message: '测试接口 POST 调用成功！',
      apiListId: api.id,
      statisticsEnabled: api.isStatistics,
      callId: null,
    },
  }
})
