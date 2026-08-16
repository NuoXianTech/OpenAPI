/**
 * Emoji-AES。
 *
 * 流程：CryptoJS.AES.encrypt(msg, key) → Base64 字符替换为 emoji 集合中对应位置的图标，
 * 支持 rotation（0~64）整体轮转。源自 api_demo/emoji-aes/js/emoji-aes.js。
 *
 * 65 个 emoji 一一对应 a-z A-Z 0-9 + / =，rotation 仅作用于前 64 个（'=' 固定不动）。
 */

import { register } from '../registry'
import { createCryptoBusinessError, isCryptoBusinessError } from '../types'
import { CIPHER_AES_256_CBC, opensslSaltedDecrypt, opensslSaltedEncrypt } from '../cryptojs-openssl'

const EMOJIS_INIT = [
  '🍎', '🍌', '🏎', '🚪', '👁', '👣', '😀', '🖐', 'ℹ', '😂',
  '🥋', '✉', '🚹', '🌉', '👌', '🍍', '👑', '👉', '🎤', '🚰',
  '☂', '🐍', '💧', '✖', '☀', '🦓', '🏹', '🎈', '😎', '🎅',
  '🐘', '🌿', '🌏', '🌪', '☃', '🍵', '🍴', '🚨', '📮', '🕹',
  '📂', '🛩', '⌨', '🔄', '🔬', '🐅', '🙃', '🐎', '🌊', '🚫',
  '❓', '⏩', '😁', '😆', '💵', '🤣', '☺', '😊', '😇', '😡',
  '🎃', '😍', '✅', '🔪', '🗒'
]
const BASE64_ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/='

function rotateEmojis(rotation: number): string[] {
  if (rotation === 0) return EMOJIS_INIT
  const rotated = new Array<string>(EMOJIS_INIT.length)
  for (let i = 0; i < EMOJIS_INIT.length; i++) {
    rotated[i] = EMOJIS_INIT[(i + rotation) % EMOJIS_INIT.length]!
  }
  return rotated
}

export function emojiAesEncrypt(message: string, key: string, rotation = 0): string {
  if (!message) throw createCryptoBusinessError('待加密明文不能为空')
  if (!key) throw createCryptoBusinessError('密钥不能为空')
  const ciphertext = opensslSaltedEncrypt(message, key, CIPHER_AES_256_CBC)
  const emojis = rotateEmojis(rotation)
  let out = ''
  for (const ch of ciphertext) {
    const idx = BASE64_ALPHABET.indexOf(ch)
    if (idx === -1) throw createCryptoBusinessError('内部编码错误：Base64 字符越界')
    out += emojis[idx]
  }
  return out
}

function emojiAesDecrypt(emojified: string, key: string, rotation = 0): string {
  if (!emojified) throw createCryptoBusinessError('待解密密文不能为空')
  if (!key) throw createCryptoBusinessError('密钥不能为空')
  const emojis = rotateEmojis(rotation)
  const emojiToIdx = new Map<string, number>()
  for (let i = 0; i < emojis.length; i++) emojiToIdx.set(emojis[i]!, i)

  // 用 Array.from 切分多 code-point emoji，逐字符顺序还原
  const chars = Array.from(emojified)
  let base64 = ''
  for (const ch of chars) {
    const idx = emojiToIdx.get(ch)
    if (idx === undefined) {
      throw createCryptoBusinessError('密文包含不属于 emoji-aes 字符表的字符')
    }
    base64 += BASE64_ALPHABET[idx]
  }

  try {
    const plain = opensslSaltedDecrypt(base64, key, CIPHER_AES_256_CBC)
    if (!plain) throw createCryptoBusinessError('解密失败：密文或密钥错误')
    return plain
  } catch (err) {
    if (isCryptoBusinessError(err)) throw err
    throw createCryptoBusinessError('解密失败：密文或密钥错误')
  }
}

register({
  name: 'emoji-aes',
  title: 'Emoji-AES',
  description: 'AES-256-CBC 加密后把 Base64 输出替换为 emoji 表情，支持 0~64 的轮转偏移。',
  summary: '使用密钥把文本转换成 Emoji 密文，也可以还原。',
  requiresKey: true,
  modes: ['encrypt', 'decrypt'],
  options: [
    { name: 'key', type: 'string', required: true, description: 'AES 密钥（任意长度字符串）' },
    {
      name: 'rotation',
      type: 'number',
      default: 0,
      min: 0,
      max: 64,
      description: 'emoji 表轮转偏移；加/解密需使用相同值，默认 0'
    }
  ],
  exec({ mode, text, options }) {
    const key = String(options.key ?? '')
    const rotation = (options.rotation as number | undefined) ?? 0
    const result = mode === 'encrypt'
      ? emojiAesEncrypt(text, key, rotation)
      : emojiAesDecrypt(text, key, rotation)
    return { text: result }
  }
})
