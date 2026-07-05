export function firstRow<TRows extends readonly unknown[]>(rows: TRows): TRows[0] | null {
  return rows[0] ?? null
}
