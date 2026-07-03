export interface RedemptionGenerationInput {
  amount: number
  count?: number
  prefix?: string | null
  length?: number
  maxUses?: number
  expiresAt?: Date | null
  note?: string | null
  createdBy?: number | null
}

export interface NormalizedRedemptionGeneration {
  amount: number
  count: number
  prefix: string
  length: number
  maxUses: number
  expiresAt: Date | null
  note: string | null
  createdBy: number | null
}

export interface RedemptionCodeRow {
  code: string
  amount: number
  batchId: string
  note: string | null
  maxUses: number
  usedCount: number
  expiresAt: Date | null
  isEnabled: boolean
  createdBy: number | null
}

export interface BuildRedemptionCodeRowsInput {
  codes: string[]
  amount: number
  batchId: string
  note: string | null
  maxUses: number
  expiresAt: Date | null
  createdBy: number | null
}

export interface InsertRedemptionCodesUntilCompleteInput<TInput, TInserted> {
  requestedCount: number
  maxAttempts?: number
  createRows: (count: number) => TInput[]
  insertRows: (rows: TInput[]) => Promise<TInserted[]>
}

const DEFAULT_COUNT = 1
const MAX_COUNT = 1000
const DEFAULT_CODE_LENGTH = 16
const MIN_CODE_LENGTH = 8
const MAX_CODE_LENGTH = 48
const DEFAULT_MAX_USES = 1
const MAX_PREFIX_LENGTH = 16
const MAX_NOTE_LENGTH = 500
const DEFAULT_MAX_ATTEMPTS = 5

function normalizeInteger(value: number | undefined, fallback: number): number {
  if (value === undefined || !Number.isFinite(value)) return fallback
  return Math.trunc(value)
}

function clampInteger(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function normalizePrefix(prefix: string | null | undefined): string {
  return (prefix || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '')
    .slice(0, MAX_PREFIX_LENGTH)
}

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
    amount: Math.max(normalizeInteger(input.amount, 1), 1),
    count: clampInteger(normalizeInteger(input.count, DEFAULT_COUNT), 1, MAX_COUNT),
    length: clampInteger(normalizeInteger(input.length, DEFAULT_CODE_LENGTH), MIN_CODE_LENGTH, MAX_CODE_LENGTH),
    maxUses: Math.max(normalizeInteger(input.maxUses, DEFAULT_MAX_USES), 1),
    prefix: normalizePrefix(input.prefix),
    note: normalizeNote(input.note),
    expiresAt: normalizeDate(input.expiresAt),
    createdBy: input.createdBy ?? null
  }
}

export function buildRedemptionCodeRows(input: BuildRedemptionCodeRowsInput): RedemptionCodeRow[] {
  return input.codes.map(code => ({
    code,
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
  const requestedCount = Math.max(normalizeInteger(input.requestedCount, 0), 0)
  const maxAttempts = Math.max(normalizeInteger(input.maxAttempts, DEFAULT_MAX_ATTEMPTS), 1)
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
