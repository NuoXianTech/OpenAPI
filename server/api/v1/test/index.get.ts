import type { H3Event } from 'h3'
import { createError, getHeader, getQuery, getRequestIP } from 'h3'
import { apiService } from '~~/server/service/apiService'
import { apiCallService } from '~~/server/service/apiCallService'
import { apiKeyService } from '~~/server/service/apiKeyService'

function getErrorStatusCode(error: unknown) {
  if (typeof error === 'object' && error && 'statusCode' in error) {
    const statusCode = Number((error as { statusCode?: number }).statusCode)
    if (Number.isFinite(statusCode) && statusCode > 0) {
      return statusCode
    }
  }

  return 500
}

function isPgUniqueViolation(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === '23505'
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
      httpMethod: 'GET',
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
  const startedAt = Date.now()
  const testApiCode = 'test_statistics_demo'
  let matchedApiKeyId: number | null = null
  let api = await ensureTestApi(testApiCode)

  const recordCall = async (statusCode: number) => {
    if (!api?.isStatistics) {
      return null
    }

    try {
      return await apiCallService.addCallAndUpsertDailyStat({
        apiListId: api.id,
        apiKeyId: matchedApiKeyId,
        userId: null,
        path: event.path,
        method: event.method,
        statusCode,
        latencyMs: Math.max(Date.now() - startedAt, 0),
        ip: getRequestIP(event) || null,
        requestSize: null,
        responseSize: null,
        rawRequest: null,
        statDate: new Date(),
        statApiPath: api.apiPath,
      })
    }
    catch (error) {
      console.error('failed to record api call stats', error)
      return null
    }
  }

  try {
    if (api && !api.isApiKey) {
      api = await apiService.updateApi(api.id, null, { isApiKey: true })
    }

    if (!api) {
      throw createError({ statusCode: 404, message: 'api not found' })
    }

    const query = getQuery(event)
    const apiKey = (query.apiKey || getHeader(event, 'x-api-key') || '').toString().trim()

    if (api.isApiKey && !apiKey) {
      await recordCall(401)
      return {
        code: 401,
        msg: 'need api key',
        data: { needApiKey: true, allowed: false },
      }
    }

    if (api.isApiKey) {
      const matchedKey = await apiKeyService.getByApiKey(apiKey)
      if (!matchedKey || !matchedKey.isActive) {
        await recordCall(401)
        return {
          code: 401,
          msg: 'invalid api key',
          data: { needApiKey: true, allowed: false, valid: false },
        }
      }
      matchedApiKeyId = matchedKey.id
    }

    const callId = await recordCall(200)

    return {
      code: 0,
      msg: 'ok',
      data: {
        message: '测试接口调用成功！',
        apiListId: api.id,
        statisticsEnabled: api.isStatistics,
        callId,
      },
    }
  }
  catch (error) {
    await recordCall(getErrorStatusCode(error))
    throw error
  }
})
