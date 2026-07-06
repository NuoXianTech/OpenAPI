/**
 * 兽语 (Beast_SDK)。
 *
 * 算法：UTF-16 码点 → 4 位 hex → 每位 hex 加上 (位置 % 16) 后用 4 个汉字
 * (嗷 呜 啊 ~) 二位编码。源自 api_demo/beast_sdk/JavaScript/beast.js。
 */

import { register } from '../registry'
import { createCryptoBusinessError } from '../types'

const BEAST_DICT = ['嗷', '呜', '啊', '~']

export function beastEncode(text: string): string {
  let hex = ''
  for (let i = 0; i < text.length; i++) {
    hex += text.charCodeAt(i).toString(16).padStart(4, '0')
  }
  let out = ''
  for (let i = 0; i < hex.length; i++) {
    let k = Number.parseInt(hex[i]!, 16) + (i % 0x10)
    if (k >= 0x10) k -= 0x10
    out += BEAST_DICT[Math.floor(k / 4)]! + BEAST_DICT[k % 4]!
  }
  return out
}

function beastDecode(text: string): string {
  const chars = Array.from(text)
  // 字典里包含 ~，要剔除非字典字符以兼容前后空白
  const filtered = chars.filter(c => BEAST_DICT.includes(c))
  if (filtered.length === 0) return ''
  if (filtered.length % 2 !== 0) {
    throw createCryptoBusinessError('密文长度异常，无法解码（汉字数应为偶数）')
  }
  let hex = ''
  for (let i = 0; i < filtered.length; i += 2) {
    const p1 = BEAST_DICT.indexOf(filtered[i]!)
    const p2 = BEAST_DICT.indexOf(filtered[i + 1]!)
    let v = p1 * 4 + p2 - (Math.floor(i / 2) % 0x10)
    if (v < 0) v += 0x10
    hex += v.toString(16)
  }
  if (hex.length % 4 !== 0) {
    throw createCryptoBusinessError('密文长度异常，无法还原为字符')
  }
  let out = ''
  for (let i = 0; i < hex.length; i += 4) {
    out += String.fromCharCode(Number.parseInt(hex.slice(i, i + 4), 16))
  }
  return out
}

register({
  name: 'beast',
  title: '兽语',
  description: '把任意文本编码为「嗷呜啊~」四字组成的兽语。',
  modes: ['encrypt', 'decrypt'],
  exec({ mode, text }) {
    return { text: mode === 'encrypt' ? beastEncode(text) : beastDecode(text) }
  }
})
