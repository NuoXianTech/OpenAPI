/**
 * Admin · 通用日志 / 数据看板 共享类型
 *
 * 通用日志（admin/logs）把两类审计源整合到同一视图：
 *   1. api_calls         → API 调用流水（消耗 / 错误 / 未知）
 *   2. credit_transactions → 积分变动流水（充值 / 兑换 / 管理 / 系统 / 退款）
 *
 * 数据看板（admin/analytics）专注「公共接口分析」：仅基于 apis.isEnabled
 *  + apis.isStatistics + api_call_stats，与 stats 公开页同源，但视角更细。
 */

// ────────────────────────────────────────────────────────────────────
// 通用日志 - 类型枚举
// ────────────────────────────────────────────────────────────────────

/**
 * 通用日志条目类型 · 与 sidebar 筛选器一一对应。
 *
 *   unknown   未知    - 兜底（不在已知映射内的来源）
 *   recharge  充值    - 充值（管理员加分、注册赠送等"无成本入账"暂归类此处）
 *   exchange  兑换    - 兑换码兑换
 *   consume   消耗    - API 调用成功扣费
 *   admin     管理    - 管理员加/减/重置积分
 *   system    系统    - 系统赠送 / 自动发放
 *   error     错误    - API 调用失败（含计费失败）
 *   refund    退款    - API 调用退款
 */
export type AdminLogType
  = | 'unknown'
    | 'recharge'
    | 'exchange'
    | 'consume'
    | 'admin'
    | 'system'
    | 'error'
    | 'refund'

export const ADMIN_LOG_TYPES: AdminLogType[] = [
  'unknown',
  'recharge',
  'exchange',
  'consume',
  'admin',
  'system',
  'error',
  'refund'
]

// ────────────────────────────────────────────────────────────────────
// 通用日志 - 列表行
// ────────────────────────────────────────────────────────────────────

/**
 * 来源类别：决定 detail / cost 字段的语义。
 *   - api_call : 行来自 api_calls，cost = creditsCost（消耗），detail 含 method/status/latency
 *   - credit   : 行来自 credit_transactions，cost = amount（带符号），detail 含 reason/balanceAfter
 */
export type AdminLogSource = 'api_call' | 'credit'

export interface AdminLogRow {
  /** 行 id：来自原表，按 source 区分命名空间 */
  id: number
  source: AdminLogSource
  type: AdminLogType
  /** 调用 / 流水发生时间 */
  createdAt: string

  // ─── 用户 / 密钥 / 请求 标识（展开区使用）──────────────────────────
  userId: number | null
  userName: string | null
  apiKeyId: number | null
  apiKeyName: string | null
  /** api_calls 行有；credit_transactions 行回查 apiCallId → requestId */
  requestId: string | null

  // ─── 接口 / 分类（筛选区使用）──────────────────────────────────
  apiId: number | null
  apiName: string | null
  apiPath: string | null
  categoryId: number | null
  categoryName: string | null

  // ─── 费用 / 详情 ───────────────────────────────────────────────
  /**
   * 费用：
   *   - api_call : creditsCost（≥0；正数表示扣费金额）
   *   - credit   : amount（带符号；负数=出账）
   */
  cost: number

  /** 调用日志详情（仅 source=api_call 时有意义） */
  method: string | null
  statusCode: number | null
  latencyMs: number | null
  errorCode: string | null
  errorMessage: string | null

  /** 积分流水详情（仅 source=credit 时有意义） */
  reason: string | null
  balanceAfter: number | null
  operatorName: string | null
  remark: string | null
}

// ────────────────────────────────────────────────────────────────────
// 通用日志 - 筛选 / 列表响应
// ────────────────────────────────────────────────────────────────────

export interface AdminLogsListQuery {
  /** ISO 字符串 */
  startAt?: string
  endAt?: string
  apiId?: number
  categoryId?: number
  /** 多选；缺省=全部 */
  types?: AdminLogType[]
  /** 仅在展开区联想 */
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
