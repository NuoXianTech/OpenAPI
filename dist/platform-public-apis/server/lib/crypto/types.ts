/**
 * 加/解密算法元数据 + 运行时契约。
 *
 * 每个算法在 algorithms/ 下导出一个 CryptoAlgorithm，并在 registry 中聚合。
 * dispatcher 仅与本文件定义的接口耦合，新增算法不需要改动路由。
 */

/** 算法内部选项定义，仅用于服务端校验与补齐默认值。 */
export interface CryptoOptionDefinition {
  /** options 中的字段名。key 是统一请求体中的保留字段。 */
  name: string
  type: 'string' | 'number' | 'boolean'
  /** 是否必填；缺省时尝试取 default */
  required?: boolean
  /** 默认值；type 决定其语义 */
  default?: string | number | boolean
  /** 数字参数的合法区间（闭区间） */
  min?: number
  max?: number
  /** 字符串/数字参数的枚举值 */
  enum?: Array<string | number>
  /** 仅在某些 mode 下生效；缺省=两端都生效 */
  modes?: CryptoMode[]
  /** 中文说明 */
  description: string
}

export type CryptoMode = 'encrypt' | 'decrypt'
export type CryptoAction = 'encode' | 'decode'

/** 算法运行结果统一形态 */
interface CryptoExecResult {
  text: string
}

interface CryptoExecInput {
  mode: CryptoMode
  text: string
  /** 经 normalizeOptions 校验并补齐默认值后的算法选项。 */
  options: Record<string, unknown>
}

export interface CryptoAlgorithm {
  /** 公共请求体的 algorithm，同时是 registry 主键；使用小写连字符。 */
  name: string
  /** 展示名（中文） */
  title: string
  /** 面向维护者的技术说明。 */
  description: string
  /** 面向公共调用方的通俗说明。 */
  summary: string
  /** 是否必须提供统一请求字段 key。 */
  requiresKey?: boolean
  /** 显式描述哪些 mode 可用；通常 ['encrypt','decrypt'] */
  modes: CryptoMode[]
  /** 服务端内部选项定义；不会原样暴露给公共接口。 */
  options?: CryptoOptionDefinition[]
  exec: (input: CryptoExecInput) => Promise<CryptoExecResult> | CryptoExecResult
}

/** 业务侧错误：交给 dispatcher 转 HTTP 422，并通过 markApiCallFailed 把 bizCode 写入调用日志 */
export interface CryptoBusinessError extends Error {
  readonly name: 'CryptoBusinessError'
  readonly bizCode: string
}

export function createCryptoBusinessError(
  message: string,
  bizCode: string = 'CRYPTO_FAILED'
): CryptoBusinessError {
  return Object.assign(new Error(message), {
    name: 'CryptoBusinessError' as const,
    bizCode
  })
}

export function isCryptoBusinessError(error: unknown): error is CryptoBusinessError {
  return error instanceof Error
    && error.name === 'CryptoBusinessError'
    && typeof (error as { bizCode?: unknown }).bizCode === 'string'
}
