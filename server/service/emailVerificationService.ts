import { createHmac, randomBytes } from 'node:crypto'

interface VerificationPayload {
  userId: number
  email: string
  expiresAt: number
  nonce: string
}

function base64UrlEncode(value: string) {
  return Buffer.from(value, 'utf8').toString('base64url')
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, 'base64url').toString('utf8')
}

function getSecret() {
  const secret = useRuntimeConfig().auth.emailVerifySecret
  if (!secret) {
    throw new Error('email verification secret is missing')
  }
  return secret
}

function sign(content: string) {
  return createHmac('sha256', getSecret()).update(content).digest('base64url')
}

export const emailVerificationService = {
  generateToken() {
    return randomBytes(32).toString('base64url')
  },

  async createToken(userId: number, email: string, expiresInMinutes: number) {
    const payload: VerificationPayload = {
      userId,
      email,
      expiresAt: Date.now() + expiresInMinutes * 60 * 1000,
      nonce: this.generateToken(),
    }
    const payloadText = JSON.stringify(payload)
    const encodedPayload = base64UrlEncode(payloadText)
    const token = `${encodedPayload}.${sign(encodedPayload)}`

    return { token, expiresAt: new Date(payload.expiresAt), record: payload }
  },

  async consumeToken(userId: number, token: string) {
    const [encodedPayload, signature] = token.split('.')
    if (!encodedPayload || !signature) {
      return null
    }

    if (sign(encodedPayload) !== signature) {
      return null
    }

    let payload: VerificationPayload
    try {
      payload = JSON.parse(base64UrlDecode(encodedPayload)) as VerificationPayload
    }
    catch {
      return null
    }

    if (payload.userId !== userId) {
      return null
    }

    if (payload.expiresAt < Date.now()) {
      return null
    }

    return payload
  },
}
