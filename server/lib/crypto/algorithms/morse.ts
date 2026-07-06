// 摩斯密码（ITU-R M.1677-1）
// 编码：字母/数字/常用标点 → 点划组合；字母间 1 空格；词间用 / 分隔
// 解码：忽略大小写；未知 token 抛 CryptoBusinessError

import { register } from '../registry'
import { createCryptoBusinessError } from '../types'

// 用 D 表示 dot、H 表示 dash，避免在源码中出现长串连字符（既不影响阅读，也便于 grep）
const PACKED: Record<string, string> = {
  'A': 'DH', 'B': 'HDDD', 'C': 'HDHD', 'D': 'HDD', 'E': 'D', 'F': 'DDHD', 'G': 'HHD', 'H': 'DDDD',
  'I': 'DD', 'J': 'DHHH', 'K': 'HDH', 'L': 'DHDD', 'M': 'HH', 'N': 'HD', 'O': 'HHH', 'P': 'DHHD',
  'Q': 'HHDH', 'R': 'DHD', 'S': 'DDD', 'T': 'H', 'U': 'DDH', 'V': 'DDDH', 'W': 'DHH', 'X': 'HDDH',
  'Y': 'HDHH', 'Z': 'HHDD',
  '0': 'HHHHH', '1': 'DHHHH', '2': 'DDHHH', '3': 'DDDHH', '4': 'DDDDH',
  '5': 'DDDDD', '6': 'HDDDD', '7': 'HHDDD', '8': 'HHHDD', '9': 'HHHHD',
  '.': 'DHDHDH', ',': 'HHDDHH', '?': 'DDHHDD', '\'': 'DHHHHD', '!': 'HDHDHH',
  '/': 'HDDHD', '(': 'HDHHD', ')': 'HDHHDH', '&': 'DHDDD', ':': 'HHHDDD',
  ';': 'HDHDHD', '=': 'HDDDH', '+': 'DHDHD', '-': 'HDDDDH', '_': 'DDHHDH',
  '"': 'DHDDHD', '@': 'DHHDHD'
}

function unpack(s: string): string {
  let out = ''
  for (const c of s) out += c === 'D' ? '.' : '-'
  return out
}

const TO_MORSE: Record<string, string> = {}
const FROM_MORSE: Record<string, string> = {}
for (const [ch, code] of Object.entries(PACKED)) {
  const morse = unpack(code)
  TO_MORSE[ch] = morse
  FROM_MORSE[morse] = ch
}

export function morseEncode(text: string): string {
  const words = text.toUpperCase().split(/\s+/).filter(w => w.length > 0)
  const encodedWords: string[] = []
  for (const w of words) {
    const letters: string[] = []
    for (const ch of w) {
      const code = TO_MORSE[ch]
      if (!code) {
        throw createCryptoBusinessError(`字符 "${ch}" 不在摩斯码表中（仅支持 A-Z / 0-9 / 常用标点）`)
      }
      letters.push(code)
    }
    encodedWords.push(letters.join(' '))
  }
  return encodedWords.join(' / ')
}

function morseDecode(text: string): string {
  const trimmed = text.trim()
  if (!trimmed) return ''
  const words = trimmed.split(/\s*\/\s*/)
  const out: string[] = []
  for (const w of words) {
    const letters = w.trim().split(/\s+/).filter(Boolean)
    let decoded = ''
    for (const code of letters) {
      const ch = FROM_MORSE[code]
      if (!ch) {
        throw createCryptoBusinessError(`未识别的摩斯片段 "${code}"`)
      }
      decoded += ch
    }
    out.push(decoded)
  }
  return out.join(' ')
}

register({
  name: 'morse',
  title: '摩斯密码',
  description: 'ITU 国际摩斯码表；字母间 1 空格，词间用 / 分隔。覆盖 A-Z / 0-9 / 常用标点。',
  modes: ['encrypt', 'decrypt'],
  exec({ mode, text }) {
    return { text: mode === 'encrypt' ? morseEncode(text) : morseDecode(text) }
  }
})
