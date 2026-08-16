/**
 * CryptoJS 兼容的 OpenSSL "Salted__" 密文格式。
 *
 * CryptoJS 的所有对称密码 .encrypt(text, password).toString() 都产出：
 *   base64( "Salted__" + salt(8) + ciphertext )
 *
 * key / iv 由 OpenSSL EVP_BytesToKey(MD5) 从 (password + salt) 派生：
 *   D = ''; D_i = MD5(D_{i-1} || password || salt); 取拼接前 (keyLen+ivLen) 字节为 key||iv
 *
 * 外壳与算法解耦：新增 OpenSSL-salted 兼容算法只需提供一个 OpenSslCipherSpec。
 * - AES-256-CBC：emoji-aes、buddha 使用
 * - RC4：rc4 算法使用（Node 已移除 rc4 cipher，手写 KSA + PRGA）
 */

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

const SALT_MAGIC = Buffer.from('Salted__', 'utf8')

function evpBytesToKey(password: Buffer, salt: Buffer, keyLen: number, ivLen: number): { key: Buffer, iv: Buffer } {
  const total = keyLen + ivLen
  const blocks: Buffer[] = []
  let last = Buffer.alloc(0)
  while (Buffer.concat(blocks).length < total) {
    last = createHash('md5').update(Buffer.concat([last, password, salt])).digest()
    blocks.push(last)
  }
  const combined = Buffer.concat(blocks).subarray(0, total)
  return { key: combined.subarray(0, keyLen), iv: combined.subarray(keyLen, total) }
}

export interface OpenSslCipherSpec {
  keyLen: number
  ivLen: number
  encrypt(plain: Buffer, key: Buffer, iv: Buffer): Buffer
  decrypt(cipher: Buffer, key: Buffer, iv: Buffer): Buffer
}

export const CIPHER_AES_256_CBC: OpenSslCipherSpec = {
  keyLen: 32,
  ivLen: 16,
  encrypt(plain, key, iv) {
    const c = createCipheriv('aes-256-cbc', key, iv)
    return Buffer.concat([c.update(plain), c.final()])
  },
  decrypt(cipher, key, iv) {
    const d = createDecipheriv('aes-256-cbc', key, iv)
    return Buffer.concat([d.update(cipher), d.final()])
  }
}

export const CIPHER_RC4: OpenSslCipherSpec = {
  keyLen: 32,
  ivLen: 0,
  encrypt(plain, key) { return rc4Process(key, plain) },
  decrypt(cipher, key) { return rc4Process(key, cipher) }
}

export function rc4Process(key: Buffer, data: Buffer): Buffer {
  const S = new Uint8Array(256)
  for (let i = 0; i < 256; i++) S[i] = i
  let j = 0
  for (let i = 0; i < 256; i++) {
    j = (j + S[i]! + key[i % key.length]!) & 0xff
    const t = S[i]!
    S[i] = S[j]!
    S[j] = t
  }
  const out = Buffer.allocUnsafe(data.length)
  let ii = 0
  let jj = 0
  for (let k = 0; k < data.length; k++) {
    ii = (ii + 1) & 0xff
    jj = (jj + S[ii]!) & 0xff
    const t = S[ii]!
    S[ii] = S[jj]!
    S[jj] = t
    out[k] = data[k]! ^ S[(S[ii]! + S[jj]!) & 0xff]!
  }
  return out
}

export function opensslSaltedEncrypt(plaintext: string, password: string, spec: OpenSslCipherSpec): string {
  const salt = randomBytes(8)
  const { key, iv } = evpBytesToKey(Buffer.from(password, 'utf8'), salt, spec.keyLen, spec.ivLen)
  const enc = spec.encrypt(Buffer.from(plaintext, 'utf8'), key, iv)
  return Buffer.concat([SALT_MAGIC, salt, enc]).toString('base64')
}

export function opensslSaltedDecrypt(ciphertextB64: string, password: string, spec: OpenSslCipherSpec): string {
  const raw = Buffer.from(ciphertextB64, 'base64')
  if (raw.length < 16 || !raw.subarray(0, 8).equals(SALT_MAGIC)) {
    throw new Error('密文缺少 Salted__ 前缀')
  }
  const salt = raw.subarray(8, 16)
  const body = raw.subarray(16)
  const { key, iv } = evpBytesToKey(Buffer.from(password, 'utf8'), salt, spec.keyLen, spec.ivLen)
  return spec.decrypt(body, key, iv).toString('utf8')
}
