import { describe, expect, it } from 'vitest'
import { hashPassword, verifyPassword } from '~~/server/utils/password'

describe('password hashing', () => {
  it('hashes and verifies a password without accepting another password', async () => {
    const hash = await hashPassword('correct horse battery staple')

    expect(hash).toMatch(/^scrypt\$N=16384,r=8,p=1\$/)
    await expect(verifyPassword(hash, 'correct horse battery staple')).resolves.toBe(true)
    await expect(verifyPassword(hash, 'wrong password')).resolves.toBe(false)
  })

  it.each([
    '',
    'plain-text',
    'scrypt$N=3,r=8,p=1$c2FsdA$aGFzaA',
    'scrypt$N=1073741824,r=8,p=1$c2FsdA$aGFzaA',
    'scrypt$N=16384,r=8,p=1$-$-'
  ])('rejects malformed or unsafe stored hashes', async (stored) => {
    await expect(verifyPassword(stored, 'password')).resolves.toBe(false)
  })
})
