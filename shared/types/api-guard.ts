/**
 * API 治理层类型定义（纯类型，不引入 drizzle 推导，避免 shared↔server 反向依赖）。
 *
 * - Manifest 类型：构建期生成、运行时消费
 * - 限流结果：driver 统一契约
 * - context 类型挂载：请求生命周期内供 handler / 后置中间件复用
 */

import type { RateLimitDriverName, RateLimitWindow } from '../config/apiGuard'

/** 单个文件对应的一个 endpoint（method + pattern） */
export interface ManifestEndpoint {
  /** 匹配模式，含 :param / :path*，例：/v1/user/:id/posts */
  apiPath: string
  /** HTTP 方法，'ANY' 表示无方法限定 */
  method: string
  /** 源文件相对项目根路径，用于 admin 展示与启动校验 */
  sourceFile: string
  /** 模式中 :param 的名字，按出现顺序 */
  paramNames: string[]
  /** 是否含 [...rest] catch-all 段 */
  isCatchAll: boolean
  /** 预编译的正则源串（运行时编译一次即可复用） */
  patternRegex: string
}

/**
 * 一个业务接口组：对应 server/routes/v{N}/<code>/ 下所有文件。
 * 治理配置以该对象粒度生效（isEnabled / isApiKey / rateLimit …共用）。
 */
export interface ManifestApi {
  /** 路径版本，例 'v1' */
  pathVersion: string
  /** 业务编码 = v{N} 下第一层目录/文件名 */
  code: string
  /** 源目录相对项目根路径 */
  sourceDir: string
  /** 该 code 下所有 (path, method) endpoints */
  endpoints: ManifestEndpoint[]
}

/** 匹配结果：命中的 endpoint + 解析出的路径参数 */
export interface EndpointMatch {
  endpoint: ManifestEndpoint
  params: Record<string, string>
}

/** 限流 driver 的统一调用结果 */
export interface RateLimitResult {
  allowed: boolean
  /** 当前窗口内剩余额度（allowed=false 时一般为 0） */
  remaining: number
  /** 当前窗口重置时间戳（毫秒） */
  resetAtMs: number
  /** 当前窗口限额 */
  limit: number
  /** 当前窗口维度，便于日志 */
  window: RateLimitWindow
}

/** 限流 driver 接口契约 */
export interface RateLimiter {
  readonly name: RateLimitDriverName
  /**
   * 在指定窗口上累加 1 次调用并返回是否允许通过。
   * 实现应保证原子累加；失败时抛错，由调用方按 fail-open 策略处理。
   */
  consume(key: string, limit: number, window: RateLimitWindow): Promise<RateLimitResult>
}

/** gate 拦截类型，用于观测/日志/admin 健康面板 */
export type GateOutcome
  = | 'passed'
    | 'not_registered'
    | 'disabled'
    | 'method_not_allowed'
    | 'missing_api_key'
    | 'invalid_api_key'
    | 'revoked_api_key'
    | 'expired_api_key'
    | 'scope_denied'
    | 'ip_denied'
    | 'referer_denied'
    | 'rate_limited'
    | 'quota_exceeded'
    | 'insufficient_credits'

/**
 * 统计目标 · gate 早期设置，覆盖成功与失败两种情形。
 * 用于 apiCallStats Nitro plugin 无需再次查 manifest/DB 即可写日志。
 */
export interface ApiStatsTarget {
  apiId: number
  apiPath: string
  pathVersion: string
  code: string
}
