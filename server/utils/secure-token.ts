import { createHmac, timingSafeEqual } from 'node:crypto'

export function encodeBase64Url(value: Buffer | string): string {
  return Buffer.from(value).toString('base64url')
}

export function decodeBase64Url(value: string): Buffer {
  return Buffer.from(value, 'base64url')
}

export function createHmacSignature(value: Buffer | string, secret: Buffer | string): string {
  return createHmac('sha256', secret).update(value).digest('base64url')
}

export function isTimingSafeEqual(left: Buffer | string, right: Buffer | string): boolean {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer)
}

export function hasValidHmacSignature(value: string, signature: string, secret: string): boolean {
  return isTimingSafeEqual(signature, createHmacSignature(value, secret))
}
