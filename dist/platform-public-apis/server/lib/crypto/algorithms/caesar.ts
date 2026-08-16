/**
 * 凯撒密码 (Caesar Cipher)。
 *
 * 经典字母移位密码：对 A-Z / a-z 各自循环移位 shift 位，其余字符（数字、汉字、标点等）原样保留。
 *
 * - shift 范围 1~25；超出范围按 (shift % 26 + 26) % 26 归一化
 * - 解密 = 用 -shift 加密
 * - shift=13 即 ROT13
 */

import { register } from '../registry'
import { createCryptoBusinessError } from '../types'

const A_UPPER = 'A'.charCodeAt(0)
const A_LOWER = 'a'.charCodeAt(0)

function shiftCharCode(code: number, shift: number): number {
  if (code >= A_UPPER && code <= A_UPPER + 25) {
    return ((code - A_UPPER + shift) % 26 + 26) % 26 + A_UPPER
  }
  if (code >= A_LOWER && code <= A_LOWER + 25) {
    return ((code - A_LOWER + shift) % 26 + 26) % 26 + A_LOWER
  }
  return code
}

function applyShift(text: string, shift: number): string {
  const normalized = ((shift % 26) + 26) % 26
  if (normalized === 0) return text
  let out = ''
  for (let i = 0; i < text.length; i++) {
    out += String.fromCharCode(shiftCharCode(text.charCodeAt(i), normalized))
  }
  return out
}

export function caesarEncrypt(text: string, shift = 3): string {
  if (!Number.isInteger(shift)) throw createCryptoBusinessError('shift 必须是整数')
  return applyShift(text, shift)
}

function caesarDecrypt(text: string, shift = 3): string {
  if (!Number.isInteger(shift)) throw createCryptoBusinessError('shift 必须是整数')
  return applyShift(text, -shift)
}

register({
  name: 'caesar',
  title: '凯撒密码',
  description: '经典字母移位密码，仅对 A-Z / a-z 移位，其余字符保留。shift=3 为凯撒原版，shift=13 即 ROT13。',
  summary: '按指定距离移动英文字母，也可以反向还原。',
  modes: ['encrypt', 'decrypt'],
  options: [
    {
      name: 'shift',
      type: 'number',
      default: 3,
      description: '移位距离，整数；可正可负（自动归一化到 0~25）。shift=13 即 ROT13。'
    }
  ],
  exec({ mode, text, options }) {
    const shift = (options.shift as number | undefined) ?? 3
    return { text: mode === 'encrypt' ? caesarEncrypt(text, shift) : caesarDecrypt(text, shift) }
  }
})
