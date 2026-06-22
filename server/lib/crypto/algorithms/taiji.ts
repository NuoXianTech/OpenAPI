/**
 * 太极编码。
 *
 * 流程：UTF-8 → Base64 → 每个 Base64 字符按 RC4 风格置换表映射为六十四卦之一。
 * 源自 api_demo/taiji-encode/src/*。
 *
 * - base64 字符表与 taiji 字符表一一对应，'=' 永远映射为 ☯
 * - pwd 决定 RC4 风格置换；为空时为恒等映射
 * - convMapping 状态依赖调用顺序，加/解密各自创建独立实例
 */

import { register } from '../registry'
import { createCryptoBusinessError } from '../types'
import { base64Decode, base64Encode } from './base64'

const TAIJI_CHS = '䷁䷗䷆䷒䷎䷣䷭䷊䷏䷲䷧䷵䷽䷶䷟䷡䷇䷂䷜䷻䷦䷾䷯䷄䷬䷐䷮䷹䷞䷰䷛䷪䷖䷚䷃䷨䷳䷕䷑䷙䷢䷔䷿䷥䷷䷝䷱䷍䷓䷩䷺䷼䷴䷤䷸䷈䷋䷘䷅䷉䷠䷌䷫䷀☯'
const BASE64_CHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='

const TAIJI_INDEX = new Map<string, number>()
const BASE64_INDEX = new Map<string, number>()
for (let i = 0; i < TAIJI_CHS.length; i++) TAIJI_INDEX.set(TAIJI_CHS[i]!, i)
for (let i = 0; i < BASE64_CHS.length; i++) BASE64_INDEX.set(BASE64_CHS[i]!, i)

function swap(arr: number[], a: number, b: number) {
  const t = arr[a]!
  arr[a] = arr[b]!
  arr[b] = t
}

/** 基于密码生成 64 位置换函数；为空 key 时恒等映射 */
function convMapping(key: string | undefined): (idx: number) => number {
  if (!key) return idx => idx
  const S: number[] = []
  for (let i = 0; i < 64; i++) S.push(i)
  let j = 0
  for (let i = 0; i < 64; i++) {
    j = (j + S[i]! + key.charCodeAt(i % key.length)) % 64
    swap(S, i, j)
  }
  let i = 0
  j = 0
  return (idx) => {
    if (idx === 64) return 64 // '=' / ☯ 不参与置换
    i = (i + 1) % 64
    j = (j + S[i]!) % 64
    swap(S, i, j)
    return idx ^ S[(S[i]! + S[j]!) % 64]!
  }
}

export function taijiEncode(text: string, pwd?: string): string {
  const base64 = base64Encode(text)
  const map = convMapping(pwd)
  let out = ''
  for (const ch of base64) {
    const idx = BASE64_INDEX.get(ch)
    if (idx === undefined) throw createCryptoBusinessError('内部编码错误：Base64 字符越界')
    out += TAIJI_CHS[map(idx)]
  }
  return out
}

export function taijiDecode(text: string, pwd?: string): string {
  const map = convMapping(pwd)
  let base64 = ''
  for (const ch of text) {
    const idx = TAIJI_INDEX.get(ch)
    if (idx === undefined) {
      throw createCryptoBusinessError('密文包含非太极字符')
    }
    base64 += BASE64_CHS[map(idx)]
  }
  return base64Decode(base64)
}

register({
  name: 'taiji',
  title: '太极编码',
  description: '把任意文本编码为「六十四卦 + ☯」太极字符串，支持可选密码做置换增强。',
  modes: ['encrypt', 'decrypt'],
  params: [
    {
      name: 'pwd',
      type: 'string',
      description: '可选密码，长度建议 ≤ 64；为空时为恒等映射。加/解密需使用相同密码。'
    }
  ],
  exec({ mode, text, params }) {
    const pwd = (params.pwd as string | undefined) || undefined
    return { text: mode === 'encrypt' ? taijiEncode(text, pwd) : taijiDecode(text, pwd) }
  }
})
