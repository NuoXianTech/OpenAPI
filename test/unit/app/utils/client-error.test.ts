import { describe, expect, it } from 'vitest'
import { parseFetchError } from '~/utils/client-error'

describe('parseFetchError', () => {
  it('falls back for Zod type errors returned by the API', () => {
    expect(parseFetchError({ data: { message: '无效输入：期望 string，实际接收 数字' } }, '保存失败'))
      .toBe('保存失败')
    expect(parseFetchError({ data: { message: '字段值不合法：无效输入：期望 string，实际接受 数字' } }, '保存失败'))
      .toBe('保存失败')
    expect(parseFetchError({ data: { message: 'Invalid input: expected string, received number' } }, 'Save failed'))
      .toBe('Save failed')
  })

  it('uses status-specific feedback when available for a technical error', () => {
    expect(parseFetchError(
      { data: { message: '无效输入：期望 string，实际接受 数字' }, statusCode: 401 },
      '登录失败',
      { 401: '账号或密码错误' }
    )).toBe('账号或密码错误')
  })

  it('keeps business messages unchanged', () => {
    expect(parseFetchError({ data: { message: '当前密码不正确' } }, '操作失败')).toBe('当前密码不正确')
  })
})
