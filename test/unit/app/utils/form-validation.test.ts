import { describe, expect, it } from 'vitest'
import {
  confirmationError,
  emailError,
  integerRangeError,
  passwordError,
  usernameError
} from '@/utils/form-validation'

describe('form validation utilities', () => {
  it('validates authentication fields with user-facing errors', () => {
    expect(usernameError('username', '')?.message).toBe('用户名不能为空')
    expect(usernameError('username', 'valid_user')).toBeNull()
    expect(emailError('email', 'invalid')?.message).toBe('请输入有效的邮箱地址')
    expect(emailError('email', 'user@example.com')).toBeNull()
    expect(passwordError('password', 'short')?.message).toBe('密码至少 8 位')
    expect(confirmationError('confirm', 'different', 'password')?.message)
      .toBe('两次输入的密码不一致')
  })

  it('validates integer ranges without coercing invalid values', () => {
    expect(integerRangeError('timeoutMs', 100, '超时时间', 100, 120_000)).toBeNull()
    expect(integerRangeError('timeoutMs', 0, '超时时间', 100, 120_000)?.message)
      .toBe('超时时间必须是 100 到 120000 之间的整数')
    expect(integerRangeError('limit', 1.5, '限流', 0)?.message)
      .toBe('限流必须是不小于 0 的整数')
  })
})
