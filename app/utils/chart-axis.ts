export function createChartIndexedTickFormatter<TRow>(
  getRows: () => readonly TRow[],
  getLabel: (row: TRow) => string
) {
  return function formatChartIndexedTick(tick: number | Date | string): string {
    if (typeof tick === 'string') return tick
    if (typeof tick !== 'number') return ''

    const rows = getRows()
    const index = Math.min(Math.max(rows.length - 1, 0), Math.max(0, Math.round(tick)))
    const row = rows[index]
    return row ? getLabel(row) : ''
  }
}

export function formatChartIntegerTick(tick: number | Date): string {
  return typeof tick === 'number' ? Math.round(tick).toString() : ''
}

export function truncateChartAxisLabel(label: string, maxLength = 6): string {
  return label.length > maxLength ? `${label.slice(0, maxLength)}…` : label
}
