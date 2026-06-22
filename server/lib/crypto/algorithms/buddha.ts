/**
 * 与佛论禅 (Talk With Buddha)。
 *
 * 流程：CryptoJS.AES.encrypt(msg, key) → 去掉前 10 字符的固定 base64 前缀
 * "U2FsdGVkX1"（即 "Salted__" 编码的前 10 字节）→ 每个字符替换为佛经常用字 →
 * 前缀 "佛又曰：" 。解密反向。源自 api_demo/talk-with-buddha/js/main.js。
 *
 * 默认密钥 "takuron.top" 与原站保持一致，缺省时使用。
 */

import { register } from '../registry'
import { createCryptoBusinessError } from '../types'
import { CIPHER_AES_256_CBC, opensslSaltedDecrypt, opensslSaltedEncrypt } from '../cryptojs-openssl'

const PREFIX = '佛又曰：'
const FIXED_BASE64_HEAD = 'U2FsdGVkX1'
const DEFAULT_KEY = 'takuron.top'

// 顺序对应原站 main.js，e/E/t/T 等字母 + 数字 + 特殊符号 → 佛经字
const MAPPING_PAIRS: Array<[string, string]> = [
  ['e', '啰'], ['E', '羯'], ['t', '婆'], ['T', '提'], ['a', '摩'], ['A', '埵'],
  ['o', '诃'], ['O', '迦'], ['i', '耶'], ['I', '吉'], ['n', '娑'], ['N', '佛'],
  ['s', '夜'], ['S', '驮'], ['h', '那'], ['H', '谨'], ['r', '悉'], ['R', '墀'],
  ['d', '阿'], ['D', '呼'], ['l', '萨'], ['L', '尼'], ['c', '陀'], ['C', '唵'],
  ['u', '唎'], ['U', '伊'], ['m', '卢'], ['M', '喝'], ['w', '帝'], ['W', '烁'],
  ['f', '醯'], ['F', '蒙'], ['g', '罚'], ['G', '沙'], ['y', '嚧'], ['Y', '他'],
  ['p', '南'], ['P', '豆'], ['b', '无'], ['B', '孕'], ['v', '菩'], ['V', '伽'],
  ['k', '怛'], ['K', '俱'], ['j', '哆'], ['J', '度'], ['x', '皤'], ['X', '阇'],
  ['q', '室'], ['Q', '地'], ['z', '利'], ['Z', '遮'],
  ['0', '穆'], ['1', '参'], ['2', '舍'], ['3', '苏'], ['4', '钵'],
  ['5', '曳'], ['6', '数'], ['7', '写'], ['8', '栗'], ['9', '楞'],
  ['+', '咩'], ['/', '输'], ['=', '漫']
]

const TO_BUDDHA = new Map<string, string>()
const FROM_BUDDHA = new Map<string, string>()
for (const [a, b] of MAPPING_PAIRS) {
  TO_BUDDHA.set(a, b)
  FROM_BUDDHA.set(b, a)
}

export function buddhaEncrypt(message: string, key: string = DEFAULT_KEY): string {
  if (!message) throw createCryptoBusinessError('待加密明文不能为空')
  const ciphertext = opensslSaltedEncrypt(message, key || DEFAULT_KEY, CIPHER_AES_256_CBC)
  // 原站丢弃前 10 字符（固定的 "U2FsdGVkX1"），解密时拼回
  if (!ciphertext.startsWith(FIXED_BASE64_HEAD)) {
    throw createCryptoBusinessError('内部加密格式异常')
  }
  const tail = ciphertext.slice(FIXED_BASE64_HEAD.length)
  let mapped = ''
  for (const ch of tail) {
    const replacement = TO_BUDDHA.get(ch)
    if (replacement === undefined) {
      throw createCryptoBusinessError(`内部编码错误：未知字符 ${ch}`)
    }
    mapped += replacement
  }
  return PREFIX + mapped
}

export function buddhaDecrypt(ciphertext: string, key: string = DEFAULT_KEY): string {
  if (!ciphertext) throw createCryptoBusinessError('待解密密文不能为空')
  if (!ciphertext.startsWith(PREFIX)) {
    throw createCryptoBusinessError(`密文必须以 "${PREFIX}" 开头`)
  }
  const body = ciphertext.slice(PREFIX.length)
  let base64Tail = ''
  for (const ch of body) {
    const replacement = FROM_BUDDHA.get(ch)
    if (replacement === undefined) {
      throw createCryptoBusinessError('密文包含非佛语字符，无法还原')
    }
    base64Tail += replacement
  }
  try {
    return opensslSaltedDecrypt(FIXED_BASE64_HEAD + base64Tail, key || DEFAULT_KEY, CIPHER_AES_256_CBC)
  } catch {
    throw createCryptoBusinessError('解密失败：密文或密钥错误')
  }
}

register({
  name: 'buddha',
  title: '与佛论禅',
  description: 'AES 加密后映射为佛经字符，输出以「佛又曰：」开头。',
  needsKey: false,
  modes: ['encrypt', 'decrypt'],
  params: [
    {
      name: 'key',
      type: 'string',
      default: DEFAULT_KEY,
      description: `AES 密钥，留空则使用默认密钥`
    }
  ],
  exec({ mode, text, params }) {
    const key = String(params.key ?? DEFAULT_KEY)
    return {
      text: mode === 'encrypt' ? buddhaEncrypt(text, key) : buddhaDecrypt(text, key)
    }
  }
})
