import type { H3Event } from 'h3'
import { getHeader, getQuery, getRequestIP, getRequestURL } from 'h3'
import { apiCallService } from '~~/server/service/apiCallService'
import { apiKeyService } from '~~/server/service/apiKeyService'
import { apiService, type StatisticsTargetItem } from '~~/server/service/apiService'

const STATISTICS_TARGET_CACHE_TTL_MS = 15_000

type StatisticsTargetCache = {
  expiresAt: number
  byPath: Map<string, Array<{
    id: number
    apiPath: string
    methods: Set<string>
  }>>
}

let statisticsTargetCache: StatisticsTargetCache | null = null
let statisticsTargetCachePromise: Promise<StatisticsTargetCache> | null = null

function normalizePathname(pathname: string) {
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1)
  }

  return pathname
}

function parseMethods(httpMethod: string) {
  return new Set(
    httpMethod
      .split(',')
      .map(method => method.trim().toUpperCase())
      .filter(Boolean),
  )
}

function parseOptionalInt(value: string | string[] | number | null | undefined) {
  const normalized = Array.isArray(value) ? value[0] : value
  if (normalized === null || normalized === undefined || normalized === '') {
    return null
  }

  const parsed = Number(normalized)
  if (!Number.isFinite(parsed)) {
    return null
  }

  const intValue = Math.trunc(parsed)
  return intValue >= 0 ? intValue : null
}

function shouldTrackPath(pathname: string) {
  return pathname.startsWith('/api/')
}

function getApiKeyFromEvent(event: H3Event) {
  const apiKeyFromHeader = (getHeader(event, 'x-api-key') || '').toString().trim()
  if (apiKeyFromHeader) {
    return apiKeyFromHeader
  }

  const query = getQuery(event)
  return (query.apiKey || '').toString().trim()
}

function supportsMethod(httpMethodList: Set<string>, method: string) {
  return httpMethodList.has(method)
    || httpMethodList.has('*')
    || httpMethodList.has('ALL')
}

function buildTargetCache(rows: StatisticsTargetItem[]): StatisticsTargetCache {
  const byPath = new Map<string, Array<{
    id: number
    apiPath: string
    methods: Set<string>
  }>>()

  for (const row of rows) {
    const normalizedPath = normalizePathname(row.apiPath)
    const candidates = byPath.get(normalizedPath) || []
    candidates.push({
      id: row.id,
      apiPath: row.apiPath,
      methods: parseMethods(row.httpMethod),
    })
    byPath.set(normalizedPath, candidates)
  }

  return {
    expiresAt: Date.now() + STATISTICS_TARGET_CACHE_TTL_MS,
    byPath,
  }
}

async function loadStatisticsTargetCache() {
  const now = Date.now()
  if (statisticsTargetCache && statisticsTargetCache.expiresAt > now) {
    return statisticsTargetCache
  }

  if (!statisticsTargetCachePromise) {
    statisticsTargetCachePromise = (async () => {
      const rows = await apiService.listStatisticsTargets()
      const cache = buildTargetCache(rows)
      statisticsTargetCache = cache
      return cache
    })().finally(() => {
      statisticsTargetCachePromise = null
    })
  }

  return statisticsTargetCachePromise
}

async function resolveStatisticsTarget(pathname: string, method: string) {
  const cache = await loadStatisticsTargetCache()
  const candidates = cache.byPath.get(pathname)
  if (!candidates || candidates.length === 0) {
    return null
  }

  const target = candidates.find(candidate => supportsMethod(candidate.methods, method))
  if (!target) {
    return null
  }

  return {
    apiId: target.id,
    apiPath: target.apiPath,
  }
}

async function resolveApiKeyId(apiKey: string) {
  if (!apiKey) {
    return null
  }

  const matchedApiKey = await apiKeyService.getByApiKey(apiKey)
  if (!matchedApiKey || !matchedApiKey.isActive) {
    return null
  }

  return matchedApiKey.id
}

export default defineEventHandler((event: H3Event) => {
  const requestUrl = getRequestURL(event)
  const pathname = normalizePathname(requestUrl.pathname)
  if (!shouldTrackPath(pathname)) {
    return
  }

  const startedAt = Date.now()
  const method = (event.method || 'GET').toUpperCase()
  const ip = getRequestIP(event) || null
  const apiKey = getApiKeyFromEvent(event)
  const requestSize = parseOptionalInt(getHeader(event, 'content-length'))
  const userAgent = (getHeader(event, 'user-agent') || null)?.slice(0, 500) || null
  const referer = (getHeader(event, 'referer') || getHeader(event, 'referrer') || null)?.slice(0, 1000) || null
  const queryString = requestUrl.search ? requestUrl.search.slice(1, 2001) : null

  event.node.res.once('finish', () => {
    const statusCode = Math.trunc(event.node.res.statusCode || 200)
    const responseSize = parseOptionalInt(
      event.node.res.getHeader('content-length') as string | string[] | number | undefined,
    )
    const latencyMs = Math.max(Date.now() - startedAt, 0)

    void (async () => {
      try {
        const target = await resolveStatisticsTarget(pathname, method)
        if (!target) {
          return
        }

        const apiKeyId = await resolveApiKeyId(apiKey)
        await apiCallService.addCallAndUpsertDailyStat({
          apiId: target.apiId,
          apiKeyId,
          userId: null,
          path: pathname,
          method,
          statusCode,
          latencyMs,
          ip,
          userAgent,
          referer,
          queryString,
          requestSize,
          responseSize,
          statDate: new Date(),
          statApiPath: target.apiPath,
        })

        if (apiKeyId) {
          await apiKeyService.recordUsage(apiKeyId, ip)
        }
      }
      catch (error) {
        console.error('failed to record api call stats from middleware', {
          pathname,
          method,
          statusCode,
          error,
        })
      }
    })()
  })
})
