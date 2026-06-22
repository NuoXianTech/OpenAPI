/**
 * 基础 Base64：UTF-8 → Base64 / Base64 → UTF-8。
 *
 * 作为最简单的基线，也被 taiji 等内部复用。这里导出纯函数 + 算法注册两份。
 */

import { register } from '../registry'
import { createCryptoBusinessError } from '../types'

export function base64Encode(text: string): string {
  return Buffer.from(text, 'utf8').toString('base64')
}

export function base64Decode(text: string): string {
  const trimmed = text.trim()
  if (!/^[A-Za-z0-9+/=\s]*$/.test(trimmed)) {
    throw createCryptoBusinessError('输入不是合法的 Base64 字符串')
  }
  // Buffer.from 对非法 base64 不会抛异常，而是丢弃；为保持严格语义，前置正则即可
  return Buffer.from(trimmed, 'base64').toString('utf8')
}

register({
  name: 'base64',
  title: 'Base64',
  description: 'UTF-8 文本与 Base64 的标准互转，作为大多数其他编码的基础。',
  modes: ['encrypt', 'decrypt'],
  exec({ mode, text }) {
    return { text: mode === 'encrypt' ? base64Encode(text) : base64Decode(text) }
  }
})
