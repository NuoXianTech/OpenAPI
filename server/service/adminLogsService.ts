import { and, eq, sql, type SQL } from 'drizzle-orm'
import { apiCalls, apiCategories, apiKeys, apiCallStats, apis, creditTransactions, users } from '@nuxthub/db/schema'
import { addLocalDays, getLocalDayStart } from '~~/server/utils/localTime'
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
// 类型映射 SQL 表达式 - 与 shared/types/admin-logs.ts 注释保持一致
// ─────────────────────────────────────────────────────────────────────

/** api_calls 行 → AdminLogType */
const apiCallTypeExpr = sql<AdminLogType>`
  case
    when ${apiCalls.errorCode} is not null
      or ${apiCalls.statusCode} >= 400
      or ${apiCalls.isCounted} = false
    then 'error'
    else 'consume'
  end
`

/** credit_transactions 行 → AdminLogType（已排除 api_charge：由 api_calls 覆盖） */
const creditTypeExpr = sql<AdminLogType>`
  case
    when ${creditTransactions.reason} = 'redemption_code' then 'recharge'
    when ${creditTransactions.reason} in ('admin_grant', 'admin_revoke', 'admin_reset') then 'admin'
    when ${creditTransactions.reason} = 'signup_bonus' then 'system'
    when ${creditTransactions.reason} = 'api_refund' then 'refund'
    else 'unknown'
  end
`

function toNumber(value: number | string | null | undefined) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function toIso(value: Date | string | number): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString()
}

// ─────────────────────────────────────────────────────────────────────
// 通用日志查询
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

/** 类型筛选拆分为 (api_call 集合, credit 集合) → 决定是否需要查对应表 */
function splitTypes(types?: AdminLogType[]) {
  if (!types || types.length === 0) {
    return { needCalls: true, needCredits: true, callTypes: null, creditTypes: null }
  }
  const set = new Set(types)
  const callTypes = (['consume', 'error'] as AdminLogType[]).filter(t => set.has(t))
  const creditTypes = (['recharge', 'admin', 'system', 'refund', 'unknown'] as AdminLogType[]).filter(t => set.has(t))
  return {
    needCalls: callTypes.length > 0,
    needCredits: creditTypes.length > 0,
    callTypes: callTypes.length > 0 ? callTypes : null,
    creditTypes: creditTypes.length > 0 ? creditTypes : null
  }
}

export const adminLogsService = {
  /**
   * 通用日志列表 · 合并 api_calls + credit_transactions（排除 api_charge）
   *
   * 策略：分别查询两表，按时间戳并入内存后排序分页。
   * 对管理后台场景（深度分页极少触发）已足够；如未来量级翻倍，可改 SQL UNION + 物化视图。
   */
  async listLogs(input: ListLogsInput = {}): Promise<AdminLogsListResponse> {
    const limit = Math.min(Math.max(Math.trunc(input.limit ?? 50), 1), 200)
    const offset = Math.max(Math.trunc(input.offset ?? 0), 0)
    const fetchCap = limit + offset

    const { needCalls, needCredits, callTypes, creditTypes } = splitTypes(input.types)

    // ─── api_calls 子查询 ───────────────────────────────────────────
    const callsRows: AdminLogRow[] = []
    let callsTotal = 0
    if (needCalls) {
      const conds: SQL[] = []
      if (input.startAt) conds.push(sql`${apiCalls.createdAt} >= ${input.startAt}`)
      if (input.endAt) conds.push(sql`${apiCalls.createdAt} < ${input.endAt}`)
      if (input.apiId && input.apiId > 0) conds.push(eq(apiCalls.apiId, input.apiId))
      if (input.categoryId && input.categoryId > 0) conds.push(eq(apis.categoryId, input.categoryId))
      if (input.userId && input.userId > 0) conds.push(eq(apiCalls.userId, input.userId))
      if (input.apiKeyId && input.apiKeyId > 0) conds.push(eq(apiCalls.apiKeyId, input.apiKeyId))
      if (input.requestId) conds.push(sql`${apiCalls.requestId}::text = ${input.requestId}`)
      if (callTypes) {
        conds.push(sql`(${apiCallTypeExpr}) in ${callTypes}`)
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
        cost: apiCalls.creditsCost,
        method: apiCalls.method,
        statusCode: apiCalls.statusCode,
        latencyMs: apiCalls.latencyMs,
        errorCode: apiCalls.errorCode,
        errorMessage: apiCalls.errorMessage
      })
        .from(apiCalls)
        .leftJoin(apis, eq(apis.id, apiCalls.apiId))
        .leftJoin(apiCategories, eq(apiCategories.id, apis.categoryId))
        .leftJoin(apiKeys, eq(apiKeys.id, apiCalls.apiKeyId))
        .leftJoin(users, eq(users.id, apiCalls.userId))

      const [items, totalRows] = await Promise.all([
        (where ? baseSelect.where(where) : baseSelect)
          .orderBy(sql`${apiCalls.createdAt} desc`)
          .limit(fetchCap),
        (where
          ? db.select({ value: sql<number>`count(*)` }).from(apiCalls)
              .leftJoin(apis, eq(apis.id, apiCalls.apiId))
              .where(where)
          : db.select({ value: sql<number>`count(*)` }).from(apiCalls))
      ])

      callsTotal = toNumber(totalRows[0]?.value)
      for (const r of items as Array<typeof items[number]>) {
        callsRows.push({
          id: r.id,
          source: 'api_call',
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
          cost: toNumber(r.cost),
          method: r.method,
          statusCode: r.statusCode,
          latencyMs: r.latencyMs,
          errorCode: r.errorCode,
          errorMessage: r.errorMessage,
          reason: null,
          balanceAfter: null,
          operatorName: null,
          remark: null
        })
      }
    }

    // ─── credit_transactions 子查询（排除 api_charge）─────────────────
    const creditRows: AdminLogRow[] = []
    let creditTotal = 0
    if (needCredits) {
      // api_charge 与 api_calls 1:1 同源（同一 apiCallId），跳过避免重复
      const conds: SQL[] = [sql`${creditTransactions.reason} <> 'api_charge'`]
      if (input.startAt) conds.push(sql`${creditTransactions.createdAt} >= ${input.startAt}`)
      if (input.endAt) conds.push(sql`${creditTransactions.createdAt} < ${input.endAt}`)
      if (input.apiId && input.apiId > 0) conds.push(eq(creditTransactions.apiId, input.apiId))
      if (input.categoryId && input.categoryId > 0) conds.push(eq(apis.categoryId, input.categoryId))
      if (input.userId && input.userId > 0) conds.push(eq(creditTransactions.userId, input.userId))
      // apiKeyId / requestId 仅 api_calls 行携带，credit 行在这些筛选下应为空
      if (input.apiKeyId && input.apiKeyId > 0) conds.push(sql`false`)
      if (input.requestId) conds.push(sql`false`)
      if (creditTypes) {
        conds.push(sql`(${creditTypeExpr}) in ${creditTypes}`)
      }
      const where = and(...conds)

      const baseSelect = db.select({
        id: creditTransactions.id,
        type: creditTypeExpr.as('type'),
        createdAt: creditTransactions.createdAt,
        userId: creditTransactions.userId,
        userName: users.username,
        apiId: creditTransactions.apiId,
        apiName: apis.name,
        apiPath: apis.apiPath,
        categoryId: apis.categoryId,
        categoryName: apiCategories.name,
        cost: creditTransactions.amount,
        reason: creditTransactions.reason,
        balanceAfter: creditTransactions.balanceAfter,
        operatorName: creditTransactions.operatorName,
        remark: creditTransactions.remark
      })
        .from(creditTransactions)
        .leftJoin(apis, eq(apis.id, creditTransactions.apiId))
        .leftJoin(apiCategories, eq(apiCategories.id, apis.categoryId))
        .leftJoin(users, eq(users.id, creditTransactions.userId))

      const [items, totalRows] = await Promise.all([
        baseSelect.where(where).orderBy(sql`${creditTransactions.createdAt} desc`).limit(fetchCap),
        db.select({ value: sql<number>`count(*)` }).from(creditTransactions)
          .leftJoin(apis, eq(apis.id, creditTransactions.apiId))
          .where(where)
      ])

      creditTotal = toNumber(totalRows[0]?.value)
      for (const r of items as Array<typeof items[number]>) {
        creditRows.push({
          id: r.id,
          source: 'credit',
          type: r.type,
          createdAt: toIso(r.createdAt),
          userId: r.userId,
          userName: r.userName,
          apiKeyId: null,
          apiKeyName: null,
          requestId: null,
          apiId: r.apiId,
          apiName: r.apiName,
          apiPath: r.apiPath,
          categoryId: r.categoryId,
          categoryName: r.categoryName,
          cost: toNumber(r.cost),
          method: null,
          statusCode: null,
          latencyMs: null,
          errorCode: null,
          errorMessage: null,
          reason: r.reason,
          balanceAfter: toNumber(r.balanceAfter),
          operatorName: r.operatorName,
          remark: r.remark
        })
      }
    }

    // ─── 合并 / 排序 / 分页 ─────────────────────────────────────────
    const merged = [...callsRows, ...creditRows]
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0))
      .slice(offset, offset + limit)

    return {
      items: merged,
      total: callsTotal + creditTotal
    }
  },

  /** 通用日志的筛选下拉选项（接口 + 分类） */
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
          sql`${apiCallStats.statDate} >= ${windowStart}`,
          sql`${apiCallStats.statDate} < ${tomorrowStart}`
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
      // 近 24h 按小时聚合（来源 api_calls，因为 api_call_stats 仅按天）
      db.select({
        hour: sql<Date>`date_trunc('hour', ${apiCalls.createdAt})`,
        totalCalls: sql<number>`count(*)`
      }).from(apiCalls)
        .innerJoin(apis, eq(apis.id, apiCalls.apiId))
        .where(and(
          publicApiCondition,
          sql`${apiCalls.createdAt} >= ${last24hStart}`,
          eq(apiCalls.isCounted, true)
        ))
        .groupBy(sql`date_trunc('hour', ${apiCalls.createdAt})`)
        .orderBy(sql`date_trunc('hour', ${apiCalls.createdAt}) asc`),
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

    const distribution: AdminAnalyticsDistributionItem[] = distributionRows.map(r => ({
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
      apiCount: bucketsRows.filter(r => def.test(toNumber(r.totalCalls))).length
    }))

    const ranking: AdminAnalyticsRankItem[] = rankingRows.map((r, i) => {
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
