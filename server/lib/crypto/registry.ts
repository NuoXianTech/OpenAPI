/**
 * 算法注册中心。
 *
 * - register(algorithm)：在 algorithms/<name>.ts 顶层调用，保证 import 即注册
 * - get / list：dispatcher 与 index.get.ts 使用
 * - normalizeOptions：按内部选项定义校验入参并填默认值
 */

import type { CryptoAlgorithm, CryptoMode, CryptoOptionDefinition } from './types'
import { createCryptoBusinessError } from './types'

const registry = new Map<string, CryptoAlgorithm>()

function formatParameterName(name: string): string {
  return name === 'key' ? 'key' : `options.${name}`
}

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

function coerce(value: unknown, definition: CryptoOptionDefinition): unknown {
  if (value === undefined || value === null || value === '') return undefined
  if (definition.type === 'number') {
    const n = typeof value === 'number' ? value : Number(value)
    if (!Number.isFinite(n)) {
      throw createCryptoBusinessError(`参数 ${formatParameterName(definition.name)} 不是合法数字`)
    }
    return n
  }
  if (definition.type === 'boolean') {
    if (typeof value === 'boolean') return value
    if (value === 'true' || value === 1 || value === '1') return true
    if (value === 'false' || value === 0 || value === '0') return false
    throw createCryptoBusinessError(`参数 ${formatParameterName(definition.name)} 不是合法布尔值`)
  }
  return String(value)
}

/**
 * 按定义规范化 options；缺省值填默认，越界或未声明字段抛 CryptoBusinessError。
 * 返回新对象，不污染入参。
 */
export function normalizeOptions(
  definitions: CryptoOptionDefinition[] | undefined,
  mode: CryptoMode,
  raw: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  const allowedNames = new Set((definitions ?? []).map(definition => definition.name))
  const unknownName = Object.keys(raw).find(name => !allowedNames.has(name))
  if (unknownName) {
    throw createCryptoBusinessError(`当前算法不支持参数 ${formatParameterName(unknownName)}`)
  }
  if (!definitions || definitions.length === 0) return out

  for (const definition of definitions) {
    if (definition.modes && !definition.modes.includes(mode)) continue
    const incoming = coerce(raw[definition.name], definition)
    const final = incoming === undefined ? definition.default : incoming
    if (final === undefined) {
      if (definition.required) {
        throw createCryptoBusinessError(`缺少必填参数：${formatParameterName(definition.name)}`)
      }
      continue
    }
    if (definition.type === 'number') {
      const n = final as number
      if (definition.min !== undefined && n < definition.min) {
        throw createCryptoBusinessError(`参数 ${formatParameterName(definition.name)} 不能小于 ${definition.min}`)
      }
      if (definition.max !== undefined && n > definition.max) {
        throw createCryptoBusinessError(`参数 ${formatParameterName(definition.name)} 不能大于 ${definition.max}`)
      }
    }
    if (definition.enum && !definition.enum.includes(final as string | number)) {
      throw createCryptoBusinessError(`参数 ${formatParameterName(definition.name)} 必须是 ${definition.enum.join(' / ')} 之一`)
    }
    out[definition.name] = final
  }
  return out
}
