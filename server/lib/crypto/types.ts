/**
 * 加/解密算法元数据 + 运行时契约。
 *
 * 每个算法在 algorithms/ 下导出一个 CryptoAlgorithm，并在 registry 中聚合。
 * dispatcher 仅与本文件定义的接口耦合，新增算法不需要改动路由。
 */

/** 算法支持的某个参数的元数据，用于 GET /v1/crypto 暴露给前端动态生成表单 */
export interface CryptoParamSchema {
  /** 参数名（也是 body / 返回结构中的 key） */
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

/** 算法运行结果统一形态 */
export interface CryptoExecResult {
  text: string
  /** 算法侧附加信息（如 emoji-aes 的实际 rotation） */
  meta?: Record<string, unknown>
}

export interface CryptoExecInput {
  mode: CryptoMode
  text: string
  /** 经 normalizeParams 校验/补默认后的参数集 */
  params: Record<string, unknown>
}

export interface CryptoAlgorithm {
  /** URL 段，同时是 registry 主键；小写连字符 */
  name: string
  /** 展示名（中文） */
  title: string
  /** 简介 */
  description: string
  /** 是否需要密钥（仅用于 UI 提示，校验由 params 描述） */
  needsKey?: boolean
  /** 显式描述哪些 mode 可用；通常 ['encrypt','decrypt'] */
  modes: CryptoMode[]
  /** 入参 schema；text 字段不在此列，统一由 dispatcher 注入 */
  params?: CryptoParamSchema[]
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
