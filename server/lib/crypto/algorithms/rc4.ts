/**
 * RC4 加/解密。
 *
 * 通过 `format` 参数切换两种互通协议：
 * - 'cryptojs'（默认）：CryptoJS.RC4 的 OpenSSL Salted__ base64 格式。
 *   key 当作 password 走 EVP_BytesToKey 派生流密钥，与浏览器端 CryptoJS.RC4 互通。
 * - 'raw'：直接把 key 作为 RC4 密钥流，输出 hex/base64 纯密文。
 *   与 anycript、cryptii、菜鸟教程等通用在线 RC4 工具互通。
 *
 * Node 自 v17 起移除 'rc4' cipher，统一用 cryptojs-openssl 中的手写 KSA + PRGA。
 */

import { register } from '../registry'
import { createCryptoBusinessError } from '../types'
import { CIPHER_RC4, opensslSaltedDecrypt, opensslSaltedEncrypt } from '../cryptojs-openssl'
import {
  type BytesEncoding,
  type CipherEncoding,
  rc4RawDecryptFromStrings,
  rc4RawEncryptFromStrings
} from '../raw-cipher'

export function rc4Encrypt(plaintext: string, password: string): string {
  if (!plaintext) throw createCryptoBusinessError('待加密明文不能为空')
  if (!password) throw createCryptoBusinessError('密钥不能为空')
  return opensslSaltedEncrypt(plaintext, password, CIPHER_RC4)
}

function rc4Decrypt(ciphertextB64: string, password: string): string {
  if (!ciphertextB64) throw createCryptoBusinessError('待解密密文不能为空')
  if (!password) throw createCryptoBusinessError('密钥不能为空')
  try {
    return opensslSaltedDecrypt(ciphertextB64.trim(), password, CIPHER_RC4)
  } catch {
    throw createCryptoBusinessError('解密失败：密文或密钥错误')
  }
}

register({
  name: 'rc4',
  title: 'RC4',
  description: 'RC4 流密码，默认输出 CryptoJS 兼容的 OpenSSL Salted__ base64 格式；设 format=raw 可与 anycript / cryptii 等通用在线 RC4 工具互通。',
  needsKey: true,
  modes: ['encrypt', 'decrypt'],
  params: [
    { name: 'key', type: 'string', required: true, description: 'RC4 密钥' },
    {
      name: 'format',
      type: 'string',
      default: 'cryptojs',
      enum: ['cryptojs', 'raw'],
      description: 'cryptojs=Salted__ base64（默认，与 CryptoJS.RC4 互通）；raw=纯密文，与通用在线 RC4 工具互通'
    },
    {
      name: 'keyEncoding',
      type: 'string',
      default: 'utf8',
      enum: ['hex', 'base64', 'utf8'],
      description: '仅 format=raw 生效：密钥字符串的解码方式，默认 utf8'
    },
    {
      name: 'cipherEncoding',
      type: 'string',
      default: 'hex',
      enum: ['hex', 'base64'],
      description: '仅 format=raw 生效：密文编码（encrypt 输出 / decrypt 输入），默认 hex'
    }
  ],
  exec({ mode, text, params }) {
    const key = String(params.key ?? '')
    const format = (params.format as 'cryptojs' | 'raw' | undefined) ?? 'cryptojs'
    if (format === 'cryptojs') {
      return {
        text: mode === 'encrypt' ? rc4Encrypt(text, key) : rc4Decrypt(text, key),
        meta: { format }
      }
    }
    const keyEncoding = (params.keyEncoding as BytesEncoding | undefined) ?? 'utf8'
    const cipherEncoding = (params.cipherEncoding as CipherEncoding | undefined) ?? 'hex'
    const result = mode === 'encrypt'
      ? rc4RawEncryptFromStrings(text, key, keyEncoding, cipherEncoding)
      : rc4RawDecryptFromStrings(text, key, keyEncoding, cipherEncoding)
    return { text: result, meta: { format } }
  }
})
