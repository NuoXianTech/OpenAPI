import { describe, expect, it } from 'vitest'
import { registerSchema } from '~~/server/schemas/auth'

describe('authentication schemas', () => {
  it('returns user-facing messages for missing registration fields', () => {
    const result = registerSchema.safeParse({})

    expect(result.success).toBe(false)
    if (result.success) return

    const messages = Object.fromEntries(
      result.error.issues.map(issue => [String(issue.path[0]), issue.message])
    )
    expect(messages).toMatchObject({
      username: '用户名不能为空',
      email: '邮箱不能为空',
      password: '密码不能为空'
    })
  })
})
