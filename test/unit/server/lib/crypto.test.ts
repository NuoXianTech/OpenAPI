import { describe, expect, it } from 'vitest'
import { ensureCryptoRegistered } from '~~/server/lib/crypto'
import { toPublicCryptoAlgorithm } from '~~/server/lib/crypto/catalog'
import { parseCryptoRequestBody, toCryptoMode } from '~~/server/lib/crypto/request'
import { getAlgorithm, listAlgorithms, normalizeOptions } from '~~/server/lib/crypto/registry'

ensureCryptoRegistered()

describe('crypto public contract', () => {
  it('accepts the unified body and rejects old root-level algorithm parameters', () => {
    expect(parseCryptoRequestBody({
      algorithm: 'caesar',
      action: 'encode',
      input: 'Hello',
      options: { shift: 3 }
    })).toEqual({
      ok: true,
      data: {
        algorithm: 'caesar',
        action: 'encode',
        input: 'Hello',
        options: { shift: 3 }
      }
    })

    expect(parseCryptoRequestBody({
      algorithm: 'caesar',
      action: 'encode',
      input: 'Hello',
      shift: 3
    })).toMatchObject({ ok: false, code: 'UNSUPPORTED_PARAMETER' })

    expect(parseCryptoRequestBody({
      algorithm: 'rc4',
      action: 'encode',
      input: 'Hello',
      options: { key: 'legacy-location' }
    })).toMatchObject({ ok: false, code: 'UNSUPPORTED_PARAMETER' })

    expect(parseCryptoRequestBody({
      type: 'base64',
      mode: 'encrypt',
      text: 'Hello'
    })).toMatchObject({ ok: false, code: 'UNSUPPORTED_PARAMETER' })

    expect(toCryptoMode('encode')).toBe('encrypt')
    expect(toCryptoMode('decode')).toBe('decrypt')
  })

  it('publishes concise algorithm summaries without the internal option schema', () => {
    const caesar = getAlgorithm('caesar')
    expect(caesar).not.toBeNull()

    const summary = toPublicCryptoAlgorithm(caesar!)
    expect(summary).toMatchObject({
      algorithm: 'caesar',
      name: '凯撒密码',
      description: '按指定距离移动英文字母，也可以反向还原。',
      keyRequired: false,
      example: {
        algorithm: 'caesar',
        action: 'encode',
        input: 'Hello'
      }
    })
    expect(summary).not.toHaveProperty('options')
    expect(summary).not.toHaveProperty('params')
    expect(summary).not.toHaveProperty('modes')
    expect(summary).not.toHaveProperty('requiresKey')
    expect(listAlgorithms().length).toBeGreaterThan(0)
  })

  it('normalizes declared options, rejects typos, and executes an algorithm', async () => {
    const caesar = getAlgorithm('caesar')!
    const options = normalizeOptions(caesar.options, 'encrypt', { shift: 4 })
    await expect(Promise.resolve(caesar.exec({ mode: 'encrypt', text: 'Hello', options })))
      .resolves.toMatchObject({ text: 'Lipps' })

    expect(() => normalizeOptions(caesar.options, 'encrypt', { shfit: 4 }))
      .toThrow('当前算法不支持参数 options.shfit')

    const rc4 = getAlgorithm('rc4')!
    expect(() => normalizeOptions(rc4.options, 'encrypt', {}))
      .toThrow('缺少必填参数：key')
  })
})
