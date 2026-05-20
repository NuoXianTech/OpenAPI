/**
 * 裸（raw）对称加密的共用编解码工具。
 *
 * 与 cryptojs-openssl.ts 的区别：
 * - cryptojs-openssl 是 CryptoJS / OpenSSL `Salted__` 兼容外壳，输入 password
 *   后内部做 EVP_BytesToKey 派生 key/iv，输出 base64。仅与同格式工具互通。
 * - 这里是"传统"在线工具的格式：用户直接给定 key（hex/base64/utf8），
 *   输出纯 hex/base64 密文，没有 Salted__ 前缀、没有 KDF。
 *   可与 anycript / cryptii / 菜鸟教程等普通在线工具互通。
 *
 * 当前仅 RC4 算法使用 raw 模式（rc4.ts 在 format=raw 时调用）。
 */

import { CryptoBusinessError } from './types'
import { rc4Process } from './cryptojs-openssl'

export type BytesEncoding = 'hex' | 'base64' | 'utf8'
export type CipherEncoding = 'hex' | 'base64'

export function decodeBytes(value: string, encoding: BytesEncoding, fieldName: string): Buffer {
  if (encoding === 'hex') {
    const cleaned = value.replace(/\s+/g, '')
    if (!/^[0-9a-fA-F]*$/.test(cleaned) || cleaned.length % 2 !== 0) {
      throw new CryptoBusinessError(`参数 ${fieldName} 不是合法的 hex 字符串`)
    }
    return Buffer.from(cleaned, 'hex')
  }
  if (encoding === 'base64') {
    const cleaned = value.replace(/\s+/g, '')
    const buf = Buffer.from(cleaned, 'base64')
    // Buffer.from 对非法 base64 不报错，反编码回比一比长度可粗略判断
    if (buf.toString('base64').replace(/=+$/, '') !== cleaned.replace(/=+$/, '')) {
      throw new CryptoBusinessError(`参数 ${fieldName} 不是合法的 base64 字符串`)
    }
    return buf
  }
  return Buffer.from(value, 'utf8')
}

function encodeBytes(buf: Buffer, encoding: CipherEncoding): string {
  return encoding === 'hex' ? buf.toString('hex') : buf.toString('base64')
}

export function rc4RawEncryptFromStrings(
  plaintext: string,
  key: string,
  keyEncoding: BytesEncoding,
  cipherEncoding: CipherEncoding
): string {
  if (!plaintext) throw new CryptoBusinessError('待加密明文不能为空')
  const keyBuf = decodeBytes(key, keyEncoding, 'key')
  if (keyBuf.length === 0) throw new CryptoBusinessError('RC4 密钥长度不能为 0')
  return encodeBytes(rc4Process(keyBuf, Buffer.from(plaintext, 'utf8')), cipherEncoding)
}

export function rc4RawDecryptFromStrings(
  cipherText: string,
  key: string,
  keyEncoding: BytesEncoding,
  cipherEncoding: CipherEncoding
): string {
  if (!cipherText) throw new CryptoBusinessError('待解密密文不能为空')
  const keyBuf = decodeBytes(key, keyEncoding, 'key')
  if (keyBuf.length === 0) throw new CryptoBusinessError('RC4 密钥长度不能为 0')
  try {
    const cipherBuf = decodeBytes(cipherText, cipherEncoding, 'text')
    return rc4Process(keyBuf, cipherBuf).toString('utf8')
  } catch (err) {
    if (err instanceof CryptoBusinessError) throw err
    throw new CryptoBusinessError('解密失败：密文或密钥错误')
  }
}
