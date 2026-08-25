import { clampInteger, toInteger } from '~~/server/utils/number'

interface RedemptionGenerationInput {
  amount: number
  count?: number
  maxUses?: number
  expiresAt?: Date | null
  note?: string | null
  createdBy?: number | null
}

interface NormalizedRedemptionGeneration {
  amount: number
  count: number
  maxUses: number
  expiresAt: Date | null
  note: string | null
  createdBy: number | null
}

interface EncodedRedemptionCode {
  codeDigest: string
  codeCiphertext: string
  codePreview: string
}

interface RedemptionCodeRow extends EncodedRedemptionCode {
  amount: number
  batchId: string
  note: string | null
  maxUses: number
  usedCount: number
  expiresAt: Date | null
  isEnabled: boolean
  createdBy: number | null
}

interface BuildRedemptionCodeRowsInput {
  codes: EncodedRedemptionCode[]
  amount: number
  batchId: string
  note: string | null
  maxUses: number
  expiresAt: Date | null
  createdBy: number | null
}

interface InsertRedemptionCodesUntilCompleteInput<TInput, TInserted> {
  requestedCount: number
  maxAttempts?: number
  createRows: (count: number) => TInput[]
  insertRows: (rows: TInput[]) => Promise<TInserted[]>
}

const DEFAULT_COUNT = 1
const MAX_COUNT = 100
const DEFAULT_MAX_USES = 1
const MAX_NOTE_LENGTH = 500
const DEFAULT_MAX_ATTEMPTS = 5

function normalizeNote(note: string | null | undefined): string | null {
  const normalizedNote = (note || '').trim().slice(0, MAX_NOTE_LENGTH)
  return normalizedNote || null
}

function normalizeDate(value: Date | null | undefined): Date | null {
  return value && !Number.isNaN(value.getTime()) ? value : null
}

export function normalizeRedemptionGeneration(
  input: RedemptionGenerationInput
): NormalizedRedemptionGeneration {
  return {
    amount: Math.max(toInteger(input.amount, 1), 1),
    count: clampInteger(input.count, 1, MAX_COUNT, DEFAULT_COUNT),
    maxUses: Math.max(toInteger(input.maxUses, DEFAULT_MAX_USES), 1),
    note: normalizeNote(input.note),
    expiresAt: normalizeDate(input.expiresAt),
    createdBy: input.createdBy ?? null
  }
}

export function buildRedemptionCodeRows(input: BuildRedemptionCodeRowsInput): RedemptionCodeRow[] {
  return input.codes.map(code => ({
    ...code,
    amount: input.amount,
    batchId: input.batchId,
    note: input.note,
    maxUses: input.maxUses,
    usedCount: 0,
    expiresAt: input.expiresAt,
    isEnabled: true,
    createdBy: input.createdBy
  }))
}

export async function insertRedemptionCodesUntilComplete<TInput, TInserted>(
  input: InsertRedemptionCodesUntilCompleteInput<TInput, TInserted>
): Promise<TInserted[]> {
  const requestedCount = Math.max(toInteger(input.requestedCount, 0), 0)
  const maxAttempts = Math.max(toInteger(input.maxAttempts, DEFAULT_MAX_ATTEMPTS), 1)
  const inserted: TInserted[] = []

  for (let attempt = 0; attempt < maxAttempts && inserted.length < requestedCount; attempt++) {
    const missingCount = requestedCount - inserted.length
    const rows = input.createRows(missingCount)
    const rowsInserted = await input.insertRows(rows)

    inserted.push(...rowsInserted.slice(0, missingCount))
  }

  if (inserted.length < requestedCount) {
    throw new Error('Redemption code generation conflicts too often')
  }

  return inserted
}
