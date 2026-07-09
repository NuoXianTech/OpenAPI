export function firstRow<TRows extends readonly unknown[]>(rows: TRows): TRows[0] | null {
  return rows[0] ?? null
}

export function expectFirstRow<TRows extends readonly unknown[]>(rows: TRows, message = 'Expected database row was not returned'): NonNullable<TRows[0]> {
  const row = rows[0]
  if (!row) {
    throw new Error(message)
  }
  return row as NonNullable<TRows[0]>
}
