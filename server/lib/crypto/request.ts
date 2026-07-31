import type { CryptoAction, CryptoMode } from './types'

const REQUEST_FIELDS = new Set(['algorithm', 'action', 'input', 'key', 'options'])
const CRYPTO_ACTIONS: CryptoAction[] = ['encode', 'decode']

export interface CryptoRequest {
  algorithm: string
  action: CryptoAction
  input: string
  key?: string
  options: Record<string, unknown>
}

export type CryptoRequestParseResult
  = { ok: true, data: CryptoRequest }
    | { ok: false, code: string, message: string }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function toCryptoMode(action: CryptoAction): CryptoMode {
  return action === 'encode' ? 'encrypt' : 'decrypt'
}

export function parseCryptoRequestBody(value: unknown): CryptoRequestParseResult {
  if (!isRecord(value)) {
    return { ok: false, code: 'INVALID_REQUEST_BODY', message: '请求体必须是 JSON 对象' }
  }

  const unknownField = Object.keys(value).find(field => !REQUEST_FIELDS.has(field))
  if (unknownField) {
    return {
      ok: false,
      code: 'UNSUPPORTED_PARAMETER',
      message: `根级参数 ${unknownField} 不受支持，算法专属参数请放入 options`
    }
  }

  if (typeof value.algorithm !== 'string' || !value.algorithm.trim()) {
    return { ok: false, code: 'MISSING_PARAMETER', message: 'algorithm 参数不能为空' }
  }

  const action = typeof value.action === 'string' ? value.action.trim().toLowerCase() : ''
  if (!CRYPTO_ACTIONS.includes(action as CryptoAction)) {
    return { ok: false, code: 'INVALID_PARAMETER', message: 'action 必须是 encode 或 decode' }
  }

  if (typeof value.input !== 'string') {
    return { ok: false, code: 'INVALID_PARAMETER', message: 'input 参数必须是字符串' }
  }

  if (value.key !== undefined && typeof value.key !== 'string') {
    return { ok: false, code: 'INVALID_PARAMETER', message: 'key 参数必须是字符串' }
  }

  if (value.options !== undefined && !isRecord(value.options)) {
    return { ok: false, code: 'INVALID_PARAMETER', message: 'options 参数必须是 JSON 对象' }
  }

  const options = value.options ?? {}
  if ('key' in options) {
    return { ok: false, code: 'UNSUPPORTED_PARAMETER', message: '密钥请使用根级 key 参数，不要放入 options' }
  }

  return {
    ok: true,
    data: {
      algorithm: value.algorithm.trim().toLowerCase(),
      action: action as CryptoAction,
      input: value.input,
      ...(value.key !== undefined ? { key: value.key } : {}),
      options
    }
  }
}
