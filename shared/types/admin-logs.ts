/**
 * Admin · 调用日志 / 数据看板 共享类型
 *
 * 调用日志（admin/logs）：公共接口调用流水的审计视图，数据源仅来自 `api_calls`。
 *   - 不再合并积分流水：积分相关查询请走 /admin/users/credit-transactions。
 *   - 不再合并管理 / 系统 / 退款 等条目：相关操作请走 /admin/system/operation-logs。
 *
 * 数据看板（admin/analytics）专注「公共接口分析」：仅基于 apis.isEnabled
 *  + apis.isStatistics + api_call_stats，与 stats 公开页同源，但视角更细。
 */

// ────────────────────────────────────────────────────────────────────
// 调用日志 - 类型枚举
// ────────────────────────────────────────────────────────────────────

/**
 * 调用日志条目类型 · 与 sidebar 筛选器一一对应。
 *
 *   consume   请求    - API 调用成功（含免费成功 / 计费成功）
 *   error     错误    - API 调用失败（含业务可见拒绝 / HTTP 4xx-5xx / 错误码非空）
 */
export type AdminLogType = 'consume' | 'error'

export const ADMIN_LOG_TYPES: AdminLogType[] = ['consume', 'error']

// ────────────────────────────────────────────────────────────────────
// 调用日志 - 列表行
// ────────────────────────────────────────────────────────────────────

export interface AdminLogRow {
  /** 行 id：api_calls.id */
  id: number
  type: AdminLogType
  createdAt: string

  // ─── 用户 / 密钥 / 请求 标识 ─────────────────────────────────────
  userId: number | null
  userName: string | null
  apiKeyId: number | null
  apiKeyName: string | null
  requestId: string | null

  // ─── 接口 / 分类（筛选区使用）──────────────────────────────────
  apiId: number | null
  apiName: string | null
  apiPath: string
  categoryId: number | null
  categoryName: string | null

  // ─── 请求摘要 ───────────────────────────────────────────────────
  method: string
  statusCode: number
  latencyMs: number
  /** 本次请求扣费：≥0，0 = 免费请求 */
  cost: number
  /** 是否进入 api_call_stats 聚合（false = 业务可见拒绝） */
  isCounted: boolean

  // ─── 错误信息 ───────────────────────────────────────────────────
  errorCode: string | null
  errorMessage: string | null

  // ─── 详情面板字段（列表不展示，仅详情弹窗读取）─────────────────
  queryString: string | null
  ip: string | null
  userAgent: string | null
  referer: string | null
  requestSize: number | null
  responseSize: number | null
}

// ────────────────────────────────────────────────────────────────────
// 调用日志 - 筛选 / 列表响应
// ────────────────────────────────────────────────────────────────────

export interface AdminLogsListQuery {
  /** ISO 字符串 */
  startAt?: string
  endAt?: string
  apiId?: number
  categoryId?: number
  /** 多选；缺省=全部 */
  types?: AdminLogType[]
  apiKeyId?: number
  userId?: number
  requestId?: string
  limit?: number
  offset?: number
}

export interface AdminLogsListResponse {
  items: AdminLogRow[]
  total: number
}

export interface AdminLogsFilterOptions {
  apis: Array<{ id: number, name: string, apiPath: string }>
  categories: Array<{ id: number, name: string }>
}

// ────────────────────────────────────────────────────────────────────
// 数据看板 - 公共接口分析
// ────────────────────────────────────────────────────────────────────

export interface AdminAnalyticsOverview {
  /** 启用 + 纳入统计的接口数 */
  enabledApiCount: number
  /** 全量启用接口（含未纳入统计的） */
  totalEnabledApiCount: number
  /** 累计消耗积分（api_charge 出账绝对值之和） */
  totalCreditsSpent: number
  /** 近 N 天平均每日请求数（默认 7） */
  averageDailyCalls: number
  /** 平均请求数对应的窗口天数 */
  averageWindowDays: number
}

/**
 * 请求分布：按启用接口聚合调用次数（柱状图 / 面积图共用数据源）
 * 柱状图按 totalCalls 排序展示，面积图按时间叠加展示。
 */
export interface AdminAnalyticsDistributionItem {
  apiId: number
  name: string
  apiPath: string
  totalCalls: number
  successCalls: number
  failureCalls: number
}

/** 近 24 小时调用趋势（按小时聚合，length=24） */
export interface AdminAnalyticsHourlyPoint {
  /** ISO 字符串，按整点对齐 */
  hour: string
  /** "HH:00" 显示用 */
  label: string
  totalCalls: number
}

/** 调用次数分布桶（直方图：把接口按调用量分桶） */
export interface AdminAnalyticsCallBucket {
  /** 桶标签，例如 "0", "1-10", "11-100", ">100" */
  label: string
  apiCount: number
}

/** 调用次数排行 TOP-N */
export interface AdminAnalyticsRankItem {
  rank: number
  apiId: number
  name: string
  apiPath: string
  totalCalls: number
  successRate: number
}

export interface AdminAnalyticsData {
  overview: AdminAnalyticsOverview
  distribution: AdminAnalyticsDistributionItem[]
  hourlyTrend24h: AdminAnalyticsHourlyPoint[]
  callBuckets: AdminAnalyticsCallBucket[]
  ranking: AdminAnalyticsRankItem[]
  generatedAt: string
}
