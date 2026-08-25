import { describe, expect, it } from 'vitest'
import {
  buildRedemptionCodeRows,
  insertRedemptionCodesUntilComplete,
  normalizeRedemptionGeneration
} from '~~/server/services/redemption-code-generation'

describe('normalizeRedemptionGeneration', () => {
  it('clamps count, amount, max uses, and note', () => {
    const result = normalizeRedemptionGeneration({
      amount: -5,
      count: 5000,
      maxUses: 0,
      note: 'x'.repeat(600)
    })

    expect(result.amount).toBe(1)
    expect(result.count).toBe(100)
    expect(result.maxUses).toBe(1)
    expect(result.note).toHaveLength(500)
  })

  it('does not accept a caller-provided code length or prefix', () => {
    // Both were removed from the admin surface: the code format is fixed.
    const result = normalizeRedemptionGeneration({ amount: 100 })

    expect(result).not.toHaveProperty('length')
    expect(result).not.toHaveProperty('prefix')
  })
})

describe('insertRedemptionCodesUntilComplete', () => {
  it('retries missing rows after insert conflicts', async () => {
    let attempt = 0

    const inserted = await insertRedemptionCodesUntilComplete({
      requestedCount: 3,
      maxAttempts: 3,
      createRows: count => Array.from({ length: count }, (_, index) => ({ code: `CODE-${attempt}-${index}` })),
      insertRows: async (rows) => {
        attempt += 1
        return attempt === 1 ? rows.slice(0, 1) : rows
      }
    })

    expect(inserted).toHaveLength(3)
    expect(attempt).toBe(2)
  })

  it('throws when retries cannot satisfy the requested count', async () => {
    await expect(insertRedemptionCodesUntilComplete({
      requestedCount: 2,
      maxAttempts: 2,
      createRows: count => Array.from({ length: count }, (_, index) => ({ code: `CODE-${index}` })),
      insertRows: async () => []
    })).rejects.toThrow('Redemption code generation conflicts too often')
  })
})

describe('buildRedemptionCodeRows', () => {
  it('creates rows with one batch id and normalized metadata', () => {
    const rows = buildRedemptionCodeRows({
      codes: [
        { codeDigest: 'digest-a', codeCiphertext: 'cipher-a', codePreview: 'A••••A' },
        { codeDigest: 'digest-b', codeCiphertext: 'cipher-b', codePreview: 'B••••B' }
      ],
      amount: 10,
      batchId: 'BATCH',
      note: 'note',
      maxUses: 2,
      expiresAt: null,
      createdBy: 1
    })

    expect(rows).toEqual([
      { codeDigest: 'digest-a', codeCiphertext: 'cipher-a', codePreview: 'A••••A', amount: 10, batchId: 'BATCH', note: 'note', maxUses: 2, usedCount: 0, expiresAt: null, isEnabled: true, createdBy: 1 },
      { codeDigest: 'digest-b', codeCiphertext: 'cipher-b', codePreview: 'B••••B', amount: 10, batchId: 'BATCH', note: 'note', maxUses: 2, usedCount: 0, expiresAt: null, isEnabled: true, createdBy: 1 }
    ])
  })
})
