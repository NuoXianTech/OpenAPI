/**
 * 社会主义核心价值观编码。
 *
 * 算法来自 api_demo/Core-Values-Encoder/cvencode.js（特点：每个字节按 hex 拆分，
 * 0~9 直接落到 12 字汉字表前 10 个组，10~15 用 10/11 作为前缀位+偏移，前缀随机）。
 *
 * 复刻要点：
 * - UTF-8 → URI percent-encoded → 仅保留十六进制字符串
 * - 单字符 hex 映射为 duo[0..11]
 * - duo[2k]+duo[2k+1] 构成两个汉字（一组 = 4 个汉字）
 */

import { register } from '../registry'
import { createCryptoBusinessError } from '../types'

const VALUES = '富强民主文明和谐自由平等公正法治爱国敬业诚信友善'

function str2hex(str: string): string {
  // encodeURIComponent 会把 ASCII 字母/数字/-_.!~*'( ) 保留，先全部统一转 hex
  const reserved = /[A-Za-z0-9\-_.!~*'()]/g
  const prepared = str.replace(reserved, c => c.codePointAt(0)!.toString(16))
  return encodeURIComponent(prepared).replace(/%/g, '').toUpperCase()
}

function hex2str(hex: string): string {
  if ((hex.length & 1) !== 0) {
    throw createCryptoBusinessError('密文长度异常，无法解码')
  }
  const parts: string[] = []
  for (let i = 0; i < hex.length; i++) {
    if ((i & 1) === 0) parts.push('%')
    parts.push(hex[i]!)
  }
  try {
    return decodeURIComponent(parts.join(''))
  } catch {
    throw createCryptoBusinessError('密文内容损坏，无法还原为 UTF-8 文本')
  }
}

function hex2duo(hex: string): number[] {
  const duo: number[] = []
  for (const c of hex) {
    const n = Number.parseInt(c, 16)
    if (n < 10) {
      duo.push(n)
    } else if (Math.random() >= 0.5) {
      duo.push(10, n - 10)
    } else {
      duo.push(11, n - 6)
    }
  }
  return duo
}

function duo2hex(duo: number[]): string {
  const hex: number[] = []
  let i = 0
  while (i < duo.length) {
    const d = duo[i]!
    if (d < 10) {
      hex.push(d)
    } else if (d === 10) {
      i++
      hex.push(duo[i]! + 10)
    } else {
      i++
      hex.push(duo[i]! + 6)
    }
    i++
  }
  return hex.map(v => v.toString(16).toUpperCase()).join('')
}

function duo2values(duo: number[]): string {
  return duo.map(d => VALUES[2 * d]! + VALUES[2 * d + 1]!).join('')
}

export function coreValuesEncode(text: string): string {
  return duo2values(hex2duo(str2hex(text)))
}

function coreValuesDecode(text: string): string {
  const duo: number[] = []
  for (const c of text) {
    const idx = VALUES.indexOf(c)
    if (idx === -1 || idx & 1) continue // 不是合法字符或落在词组下半段
    duo.push(idx >> 1)
  }
  return hex2str(duo2hex(duo))
}

register({
  name: 'core-values',
  title: '社会主义核心价值观编码',
  description: '把任意文本编码为「富强民主…」十二词汉字串。源自 Core-Values-Encoder。',
  modes: ['encrypt', 'decrypt'],
  exec({ mode, text }) {
    return { text: mode === 'encrypt' ? coreValuesEncode(text) : coreValuesDecode(text) }
  }
})
