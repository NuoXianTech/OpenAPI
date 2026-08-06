import { and, asc, eq, gte, ilike, lt, or, sql, type SQL } from 'drizzle-orm'
import { z } from 'zod'
import { apiCalls, apiCategories, apiKeys, apiCallStats, apis, users } from '~~/server/db/schema'
import { toIsoString } from '~~/server/utils/date'
import { APP_TIME_ZONE } from '~~/server/utils/local-time'
import { clampInteger, toNullableNumber, toNumber } from '~~/server/utils/number'
import { normalizePagination } from '~~/server/utils/pagination'
import type {
  AdminDashboardHourlyPoint,
  AdminDashboardInsightsData,
  AdminLogRow,
  AdminLogType,
  AdminLogsFilterOptions,
  AdminLogsListResponse
} from '#shared/types/admin'
import type { DashboardCallRankItem } from '#shared/types/dashboard'

const HOURLY_LABEL_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  timeZone: APP_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23'
})

// ─────────────────────────────────────────────────────────────────────
// 类型映射 SQL 表达式
// ─────────────────────────────────────────────────────────────────────

/** api_calls 行 → AdminLogType（错误条件优先） */
const apiCallTypeExpr = sql<AdminLogType>`
  case
    when ${apiCalls.errorCode} is not null
      or ${apiCalls.statusCode} >= 400
      or ${apiCalls.isCounted} = false
    then 'error'
    else 'consume'
  end
`

// ─────────────────────────────────────────────────────────────────────
// 调用日志查询
// ─────────────────────────────────────────────────────────────────────

interface ListLogsInput {
  keyword?: string
  startAt?: Date
  endAt?: Date
  apiId?: number
  categoryId?: number
  types?: AdminLogType[]
  userId?: number
  apiKeyId?: number
  requestId?: string
  limit?: number
  offset?: number
}

export const adminLogsService = {
  /**
   * 调用日志列表 · 单表查询 api_calls。
   *
   * 数据源仅 api_calls：积分流水请走 /admin/logs/credits，
   * 管理 / 系统操作请走 /admin/logs/operations。
   */
  async listLogs(input: ListLogsInput = {}): Promise<AdminLogsListResponse> {
    const { limit, offset } = normalizePagination(input)

    const conds: SQL[] = []
    const keyword = input.keyword?.trim()
    if (keyword) {
      const keywordPattern = `%${keyword}%`
      conds.push(or(
        ilike(apis.name, keywordPattern),
        ilike(apiCalls.path, keywordPattern),
        ilike(apiCalls.method, keywordPattern),
        ilike(apiCalls.apiKeyName, keywordPattern),
        ilike(apiKeys.name, keywordPattern),
        ilike(users.username, keywordPattern),
        ilike(apiCategories.name, keywordPattern),
        ilike(apiCalls.ip, keywordPattern),
        ilike(apiCalls.errorCode, keywordPattern),
        ilike(apiCalls.errorMessage, keywordPattern),
        sql`${apiCalls.statusCode}::text ilike ${keywordPattern}`,
        sql`${apiCalls.requestId}::text ilike ${keywordPattern}`
      )!)
    }
    if (input.startAt) conds.push(gte(apiCalls.createdAt, input.startAt))
    if (input.endAt) conds.push(lt(apiCalls.createdAt, input.endAt))
    if (input.apiId && input.apiId > 0) conds.push(eq(apiCalls.apiId, input.apiId))
    if (input.categoryId && input.categoryId > 0) conds.push(eq(apis.categoryId, input.categoryId))
    if (input.userId && input.userId > 0) conds.push(eq(apiCalls.userId, input.userId))
    if (input.apiKeyId && input.apiKeyId > 0) conds.push(eq(apiCalls.apiKeyId, input.apiKeyId))
    if (input.requestId) {
      const requestId = z.uuid().safeParse(input.requestId)
      conds.push(requestId.success ? eq(apiCalls.requestId, requestId.data) : sql`false`)
    }
    if (input.types && input.types.length > 0 && input.types.length < 2) {
      conds.push(sql`(${apiCallTypeExpr}) in ${input.types}`)
    }
    const where = conds.length ? and(...conds) : undefined

    const baseSelect = db.select({
      id: apiCalls.id,
      type: apiCallTypeExpr.as('type'),
      createdAt: apiCalls.createdAt,
      userId: apiCalls.userId,
      userName: users.username,
      userRole: users.role,
      apiKeyId: apiCalls.apiKeyId,
      apiKeyName: sql<string | null>`coalesce(${apiCalls.apiKeyName}, ${apiKeys.name})`,
      requestId: sql<string | null>`${apiCalls.requestId}::text`,
      apiId: apiCalls.apiId,
      apiName: apis.name,
      apiPath: apiCalls.path,
      categoryId: apis.categoryId,
      categoryName: apiCategories.name,
      method: apiCalls.method,
      statusCode: apiCalls.statusCode,
      latencyMs: apiCalls.latencyMs,
      cost: apiCalls.creditsCost,
      isCounted: apiCalls.isCounted,
      errorCode: apiCalls.errorCode,
      errorMessage: apiCalls.errorMessage,
      queryString: apiCalls.queryString,
      ip: apiCalls.ip,
      userAgent: apiCalls.userAgent,
      referer: apiCalls.referer,
      requestSize: apiCalls.requestSize,
      responseSize: apiCalls.responseSize
    })
      .from(apiCalls)
      .leftJoin(apis, eq(apis.id, apiCalls.apiId))
      .leftJoin(apiCategories, eq(apiCategories.id, apis.categoryId))
      .leftJoin(apiKeys, eq(apiKeys.id, apiCalls.apiKeyId))
      .leftJoin(users, eq(users.id, apiCalls.userId))

    const countQuery = db.select({ value: sql<number>`count(*)` })
      .from(apiCalls)
      .leftJoin(apis, eq(apis.id, apiCalls.apiId))
      .leftJoin(apiCategories, eq(apiCategories.id, apis.categoryId))
      .leftJoin(apiKeys, eq(apiKeys.id, apiCalls.apiKeyId))
      .leftJoin(users, eq(users.id, apiCalls.userId))

    const [items, totalRows] = await Promise.all([
      (where ? baseSelect.where(where) : baseSelect)
        .orderBy(sql`${apiCalls.createdAt} desc`)
        .limit(limit)
        .offset(offset),
      where ? countQuery.where(where) : countQuery
    ])

    const rows: AdminLogRow[] = (items as Array<typeof items[number]>).map(r => ({
      id: r.id,
      type: r.type,
      createdAt: toIsoString(r.createdAt),
      userId: r.userId,
      userName: r.userName,
      userRole: r.userRole,
      apiKeyId: r.apiKeyId,
      apiKeyName: r.apiKeyName,
      requestId: r.requestId,
      apiId: r.apiId,
      apiName: r.apiName,
      apiPath: r.apiPath,
      categoryId: r.categoryId,
      categoryName: r.categoryName,
      method: r.method,
      statusCode: r.statusCode,
      latencyMs: r.latencyMs,
      cost: toNumber(r.cost),
      isCounted: !!r.isCounted,
      errorCode: r.errorCode,
      errorMessage: r.errorMessage,
      queryString: r.queryString,
      ip: r.ip,
      userAgent: r.userAgent,
      referer: r.referer,
      requestSize: toNullableNumber(r.requestSize),
      responseSize: toNullableNumber(r.responseSize)
    }))

    return {
      items: rows,
      total: toNumber(totalRows[0]?.value)
    }
  },

  /** 调用日志的筛选下拉选项（接口 + 分类） */
  async listFilterOptions(): Promise<AdminLogsFilterOptions> {
    const [apiRows, categoryRows] = await Promise.all([
      db.select({ id: apis.id, name: apis.name, apiPath: apis.apiPath })
        .from(apis)
        .orderBy(apis.name),
      db.select({ id: apiCategories.id, name: apiCategories.name })
        .from(apiCategories)
        .where(sql`${apiCategories.deletedAt} is null`)
        .orderBy(apiCategories.sortOrder, apiCategories.name)
    ])
    return { apis: apiRows, categories: categoryRows }
  },

  // ─────────────────────────────────────────────────────────────────
  // 管理概览 · 近 24 小时趋势与调用排行
  // ─────────────────────────────────────────────────────────────────

  async getDashboardInsights(options: { rankingLimit?: number } = {}): Promise<AdminDashboardInsightsData> {
    const rankingLimit = clampInteger(options.rankingLimit ?? 10, 1, 50, 10)
    const last24hStart = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const publicApiCondition = and(
      eq(apis.isEnabled, true),
      eq(apis.isStatistics, true)
    )
    const totalExpr = sql<number>`coalesce(sum(${apiCallStats.totalCount}), 0)`
    const successExpr = sql<number>`coalesce(sum(${apiCallStats.successCount}), 0)`

    const hourlySource = db
      .select({
        hour: sql<Date>`date_trunc('hour', ${apiCalls.createdAt})`.as('hour')
      })
      .from(apiCalls)
      .innerJoin(apis, eq(apis.id, apiCalls.apiId))
      .where(and(
        publicApiCondition,
        gte(apiCalls.createdAt, last24hStart),
        eq(apiCalls.isCounted, true)
      ))
      .as('hourly_source')

    const [hourlyRows, rankingRows] = await Promise.all([
      db.select({
        hour: hourlySource.hour,
        totalCalls: sql<number>`count(*)`
      }).from(hourlySource)
        .groupBy(hourlySource.hour)
        .orderBy(asc(hourlySource.hour)),
      db.select({
        apiId: apis.id,
        name: apis.name,
        apiPath: apis.apiPath,
        totalCalls: totalExpr,
        successCalls: successExpr
      }).from(apiCallStats)
        .innerJoin(apis, eq(apis.id, apiCallStats.apiId))
        .where(publicApiCondition)
        .groupBy(apis.id, apis.name, apis.apiPath)
        .orderBy(sql`coalesce(sum(${apiCallStats.totalCount}), 0) desc`, apis.name)
        .limit(rankingLimit)
    ])

    const hourMap = new Map<string, number>()
    for (const row of hourlyRows) {
      const date = row.hour instanceof Date ? row.hour : new Date(row.hour)
      hourMap.set(date.toISOString(), toNumber(row.totalCalls))
    }

    const nowHour = new Date()
    nowHour.setMinutes(0, 0, 0)
    const hourlyTrend24h: AdminDashboardHourlyPoint[] = Array.from({ length: 24 }, (_, index) => {
      const date = new Date(nowHour.getTime() - (23 - index) * 60 * 60 * 1000)
      const hour = date.toISOString()
      const label = HOURLY_LABEL_FORMATTER.format(date)
      return { hour, label, totalCalls: hourMap.get(hour) ?? 0 }
    })

    interface RankingRow {
      apiId: number
      name: string
      apiPath: string
      totalCalls: number
      successCalls: number
    }

    const ranking: DashboardCallRankItem[] = rankingRows.map((row: RankingRow, index: number) => {
      const totalCalls = toNumber(row.totalCalls)
      const successCalls = toNumber(row.successCalls)
      return {
        rank: index + 1,
        apiId: row.apiId,
        name: row.name,
        apiPath: row.apiPath,
        totalCalls,
        successRate: totalCalls ? Number(((successCalls / totalCalls) * 100).toFixed(2)) : 0
      }
    })

    return {
      hourlyTrend24h,
      ranking
    }
  }
}
