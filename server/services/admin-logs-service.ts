import { and, asc, eq, gte, lt, sql, type SQL } from 'drizzle-orm'
import { apiCalls, apiCategories, apiKeys, apiCallStats, apis, creditTransactions, users } from '@nuxthub/db/schema'
import { APP_TIME_ZONE, addLocalDays, getLocalDayStart } from '~~/server/utils/local-time'
import { normalizePagination } from '~~/server/utils/pagination'
import type {
  AdminAnalyticsCallBucket,
  AdminAnalyticsData,
  AdminAnalyticsDistributionItem,
  AdminAnalyticsHourlyPoint,
  AdminAnalyticsOverview,
  AdminAnalyticsRankItem,
  AdminLogRow,
  AdminLogType,
  AdminLogsFilterOptions,
  AdminLogsListResponse
} from '~~/shared/types/admin-logs'

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

function toNumber(value: number | string | null | undefined) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function toNullableNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined) return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function toIso(value: Date | string | number): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString()
}

// ─────────────────────────────────────────────────────────────────────
// 调用日志查询
// ─────────────────────────────────────────────────────────────────────

interface ListLogsInput {
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
   * 数据源仅 api_calls：积分流水请走 /admin/users/credit-logs，
   * 管理 / 系统操作请走 /admin/system/operation-logs。
   */
  async listLogs(input: ListLogsInput = {}): Promise<AdminLogsListResponse> {
    const { limit, offset } = normalizePagination(input)

    const conds: SQL[] = []
    if (input.startAt) conds.push(gte(apiCalls.createdAt, input.startAt))
    if (input.endAt) conds.push(lt(apiCalls.createdAt, input.endAt))
    if (input.apiId && input.apiId > 0) conds.push(eq(apiCalls.apiId, input.apiId))
    if (input.categoryId && input.categoryId > 0) conds.push(eq(apis.categoryId, input.categoryId))
    if (input.userId && input.userId > 0) conds.push(eq(apiCalls.userId, input.userId))
    if (input.apiKeyId && input.apiKeyId > 0) conds.push(eq(apiCalls.apiKeyId, input.apiKeyId))
    if (input.requestId) conds.push(sql`${apiCalls.requestId}::text = ${input.requestId}`)
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
      createdAt: toIso(r.createdAt),
      userId: r.userId,
      userName: r.userName,
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
  // 数据看板 · 公共接口分析
  // ─────────────────────────────────────────────────────────────────

  /**
   * 公共接口分析数据。
   *
   *   - overview     接口总数 / 总使用积分 / 平均请求数
   *   - distribution 启用接口请求分布（柱状图 + 面积图共用）
   *   - hourlyTrend  近 24 小时调用趋势
   *   - callBuckets  调用次数分布直方图
   *   - ranking      调用次数 TOP-N 排行
   *
   * 仅统计 `apis.isEnabled = true AND apis.isStatistics = true` 的"公共接口"。
   */
  async getAnalytics(options: { topLimit?: number, averageWindowDays?: number } = {}): Promise<AdminAnalyticsData> {
    const topLimit = Math.min(Math.max(Math.trunc(options.topLimit ?? 10), 1), 50)
    const averageWindowDays = Math.min(Math.max(Math.trunc(options.averageWindowDays ?? 7), 1), 30)

    const todayStart = getLocalDayStart(new Date())
    const tomorrowStart = addLocalDays(todayStart, 1)
    const windowStart = addLocalDays(todayStart, -(averageWindowDays - 1))
    const last24hStart = new Date(Date.now() - 24 * 60 * 60 * 1000)

    const publicApiCondition = and(
      eq(apis.isEnabled, true),
      eq(apis.isStatistics, true)
    )
    const totalExpr = sql<number>`coalesce(sum(${apiCallStats.totalCount}), 0)`
    const successExpr = sql<number>`coalesce(sum(${apiCallStats.successCount}), 0)`
    const failureExpr = sql<number>`coalesce(sum(${apiCallStats.failureCount}), 0)`

    // 近 24h 小时桶按 APP_TIME_ZONE 切，收进子查询只算一次；外层按纯列 hour 分组，
    // 避免时区参数在 select/group by/order by 各生成占位符、令 Postgres 报 42803（见 user/dashboard 同款）。
    const hourlySource = db
      .select({
        hour: sql<Date>`date_trunc('hour', ${apiCalls.createdAt} at time zone ${APP_TIME_ZONE})`.as('hour')
      })
      .from(apiCalls)
      .innerJoin(apis, eq(apis.id, apiCalls.apiId))
      .where(and(
        publicApiCondition,
        gte(apiCalls.createdAt, last24hStart),
        eq(apiCalls.isCounted, true)
      ))
      .as('hourly_source')

    const [
      enabledApiRows,
      totalEnabledRows,
      creditsSpentRows,
      windowRows,
      distributionRows,
      hourlyRows,
      bucketsRows,
      rankingRows
    ] = await Promise.all([
      // 接口总数（启用且纳入统计）
      db.select({ value: sql<number>`count(*)` }).from(apis).where(publicApiCondition),
      // 全量启用接口数
      db.select({ value: sql<number>`count(*)` }).from(apis).where(eq(apis.isEnabled, true)),
      // 总使用积分 = api_charge 出账绝对值
      db.select({
        value: sql<number>`coalesce(sum(case when ${creditTransactions.amount} < 0 then -${creditTransactions.amount} else 0 end), 0)`
      }).from(creditTransactions).where(eq(creditTransactions.reason, 'api_charge')),
      // 窗口内总调用数（求平均用）
      db.select({ value: totalExpr }).from(apiCallStats)
        .innerJoin(apis, eq(apis.id, apiCallStats.apiId))
        .where(and(
          publicApiCondition,
          gte(apiCallStats.statDate, windowStart),
          lt(apiCallStats.statDate, tomorrowStart)
        )),
      // 请求分布：所有启用接口（无调用接口 LEFT JOIN 后填 0）
      db.select({
        apiId: apis.id,
        name: apis.name,
        apiPath: apis.apiPath,
        totalCalls: sql<number>`coalesce(sum(${apiCallStats.totalCount}), 0)`,
        successCalls: sql<number>`coalesce(sum(${apiCallStats.successCount}), 0)`,
        failureCalls: sql<number>`coalesce(sum(${apiCallStats.failureCount}), 0)`
      }).from(apis)
        .leftJoin(apiCallStats, eq(apiCallStats.apiId, apis.id))
        .where(publicApiCondition)
        .groupBy(apis.id, apis.name, apis.apiPath)
        .orderBy(sql`coalesce(sum(${apiCallStats.totalCount}), 0) desc`, apis.name),
      // 近 24h 按小时聚合（来源 api_calls，因为 api_call_stats 仅按天）：桶来自上面的 hourlySource 子查询
      db.select({
        hour: hourlySource.hour,
        totalCalls: sql<number>`count(*)`
      }).from(hourlySource)
        .groupBy(hourlySource.hour)
        .orderBy(asc(hourlySource.hour)),
      // 调用次数分布桶
      db.select({
        apiId: apis.id,
        totalCalls: sql<number>`coalesce(sum(${apiCallStats.totalCount}), 0)`
      }).from(apis)
        .leftJoin(apiCallStats, eq(apiCallStats.apiId, apis.id))
        .where(publicApiCondition)
        .groupBy(apis.id),
      // 调用次数排行 TOP-N（含成功率）
      db.select({
        apiId: apis.id,
        name: apis.name,
        apiPath: apis.apiPath,
        totalCalls: totalExpr,
        successCalls: successExpr,
        failureCalls: failureExpr
      }).from(apiCallStats)
        .innerJoin(apis, eq(apis.id, apiCallStats.apiId))
        .where(publicApiCondition)
        .groupBy(apis.id, apis.name, apis.apiPath)
        .orderBy(sql`coalesce(sum(${apiCallStats.totalCount}), 0) desc`, apis.name)
        .limit(topLimit)
    ])

    const enabledApiCount = toNumber(enabledApiRows[0]?.value)
    const totalEnabledApiCount = toNumber(totalEnabledRows[0]?.value)
    const totalCreditsSpent = toNumber(creditsSpentRows[0]?.value)
    const windowTotal = toNumber(windowRows[0]?.value)
    const averageDailyCalls = averageWindowDays > 0
      ? Number((windowTotal / averageWindowDays).toFixed(2))
      : 0

    const overview: AdminAnalyticsOverview = {
      enabledApiCount,
      totalEnabledApiCount,
      totalCreditsSpent,
      averageDailyCalls,
      averageWindowDays
    }

    // Promise.all 对 8 个异构查询的元组推断会让靠后的结果退化为 any，
    // 显式标注回调行类型补回类型安全(distribution 与 ranking 同 shape)。
    type ApiCallStatRow = { apiId: number, name: string, apiPath: string, totalCalls: number, successCalls: number, failureCalls: number }

    const distribution: AdminAnalyticsDistributionItem[] = distributionRows.map((r: ApiCallStatRow) => ({
      apiId: r.apiId,
      name: r.name,
      apiPath: r.apiPath,
      totalCalls: toNumber(r.totalCalls),
      successCalls: toNumber(r.successCalls),
      failureCalls: toNumber(r.failureCalls)
    }))

    // 把稀疏的小时聚合填充为完整 24 个槽位（按当前小时往前推 23 小时）
    const hourMap = new Map<string, number>()
    for (const row of hourlyRows) {
      const date = row.hour instanceof Date ? row.hour : new Date(row.hour)
      hourMap.set(date.toISOString(), toNumber(row.totalCalls))
    }
    const nowHour = new Date()
    nowHour.setMinutes(0, 0, 0)
    const hourlyTrend24h: AdminAnalyticsHourlyPoint[] = Array.from({ length: 24 }, (_, i) => {
      const d = new Date(nowHour.getTime() - (23 - i) * 60 * 60 * 1000)
      const iso = d.toISOString()
      const label = `${String(d.getHours()).padStart(2, '0')}:00`
      return { hour: iso, label, totalCalls: hourMap.get(iso) ?? 0 }
    })

    // 调用次数分桶：0 / 1-10 / 11-100 / 101-1000 / >1000
    const bucketDefs: Array<{ label: string, test: (v: number) => boolean }> = [
      { label: '0', test: v => v === 0 },
      { label: '1-10', test: v => v >= 1 && v <= 10 },
      { label: '11-100', test: v => v >= 11 && v <= 100 },
      { label: '101-1000', test: v => v >= 101 && v <= 1000 },
      { label: '>1000', test: v => v > 1000 }
    ]
    const callBuckets: AdminAnalyticsCallBucket[] = bucketDefs.map(def => ({
      label: def.label,
      apiCount: bucketsRows.filter((r: { apiId: number, totalCalls: number }) => def.test(toNumber(r.totalCalls))).length
    }))

    const ranking: AdminAnalyticsRankItem[] = rankingRows.map((r: ApiCallStatRow, i: number) => {
      const total = toNumber(r.totalCalls)
      const success = toNumber(r.successCalls)
      return {
        rank: i + 1,
        apiId: r.apiId,
        name: r.name,
        apiPath: r.apiPath,
        totalCalls: total,
        successRate: total ? Number(((success / total) * 100).toFixed(2)) : 0
      }
    })

    return {
      overview,
      distribution,
      hourlyTrend24h,
      callBuckets,
      ranking,
      generatedAt: new Date().toISOString()
    }
  }
}
