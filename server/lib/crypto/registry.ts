/**
 * 算法注册中心。
 *
 * - register(algorithm)：在 algorithms/<name>.ts 顶层调用，保证 import 即注册
 * - get / list：dispatcher 与 index.get.ts 使用
 * - normalizeParams：按 CryptoParamSchema 校验入参 + 填默认值，集中容错
 */

import type { CryptoAlgorithm, CryptoMode, CryptoParamSchema } from './types'
import { createCryptoBusinessError } from './types'

const registry = new Map<string, CryptoAlgorithm>()

export function register(algorithm: CryptoAlgorithm): void {
  if (registry.has(algorithm.name)) {
    throw new Error(`Duplicate crypto algorithm: ${algorithm.name}`)
  }
  registry.set(algorithm.name, algorithm)
}

export function getAlgorithm(name: string): CryptoAlgorithm | null {
  return registry.get(name) ?? null
}

export function listAlgorithms(): CryptoAlgorithm[] {
  return Array.from(registry.values())
}

function coerce(value: unknown, schema: CryptoParamSchema): unknown {
  if (value === undefined || value === null || value === '') return undefined
  if (schema.type === 'number') {
    const n = typeof value === 'number' ? value : Number(value)
    if (!Number.isFinite(n)) {
      throw createCryptoBusinessError(`参数 ${schema.name} 不是合法数字`)
    }
    return n
  }
  if (schema.type === 'boolean') {
    if (typeof value === 'boolean') return value
    if (value === 'true' || value === 1 || value === '1') return true
    if (value === 'false' || value === 0 || value === '0') return false
    throw createCryptoBusinessError(`参数 ${schema.name} 不是合法布尔值`)
  }
  return String(value)
}

/**
 * 按 schema 规范化 params；缺省值填默认、越界抛 CryptoBusinessError、未声明字段直接忽略。
 * 返回新对象，不污染入参。
 */
export function normalizeParams(
  schemaList: CryptoParamSchema[] | undefined,
  mode: CryptoMode,
  raw: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  if (!schemaList || schemaList.length === 0) return out

  for (const schema of schemaList) {
    if (schema.modes && !schema.modes.includes(mode)) continue
    const incoming = coerce(raw[schema.name], schema)
    const final = incoming === undefined ? schema.default : incoming
    if (final === undefined) {
      if (schema.required) {
        throw createCryptoBusinessError(`缺少必填参数：${schema.name}`)
      }
      continue
    }
    if (schema.type === 'number') {
      const n = final as number
      if (schema.min !== undefined && n < schema.min) {
        throw createCryptoBusinessError(`参数 ${schema.name} 不能小于 ${schema.min}`)
      }
      if (schema.max !== undefined && n > schema.max) {
        throw createCryptoBusinessError(`参数 ${schema.name} 不能大于 ${schema.max}`)
      }
    }
    if (schema.enum && !schema.enum.includes(final as string | number)) {
      throw createCryptoBusinessError(`参数 ${schema.name} 必须是 ${schema.enum.join(' / ')} 之一`)
    }
    out[schema.name] = final
  }
  return out
}
