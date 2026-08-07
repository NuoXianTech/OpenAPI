import luckData from './data.json'

interface LuckGroup {
  category: string
  rank: number
  content: string[]
}

export interface LuckData {
  id: number
  category: string
  rank: number
  tip: string
  tip_index: number
}

const LUCK_GROUPS: readonly LuckGroup[] = luckData

export const LUCK_CATEGORY_COUNT = LUCK_GROUPS.length

export function parseLuckId(value: string): number | null | undefined {
  const normalized = value.trim()
  if (!normalized) return undefined
  if (!/^(0|[1-9][0-9]*)$/.test(normalized)) return null

  const id = Number(normalized)
  return Number.isSafeInteger(id) ? id : null
}

function randomIndex(length: number, random: () => number): number {
  return Math.floor(random() * length)
}

export function getLuck(id?: number, random: () => number = Math.random): LuckData | null {
  const groupId = id ?? randomIndex(LUCK_CATEGORY_COUNT, random)
  const group = LUCK_GROUPS[groupId]
  if (!group) return null

  const tipIndex = randomIndex(group.content.length, random)
  const tip = group.content[tipIndex]
  if (!tip) return null

  return {
    id: groupId,
    category: group.category,
    rank: group.rank,
    tip,
    tip_index: tipIndex
  }
}

export function formatLuckText(data: LuckData): string {
  return `${data.category}：${data.tip}`
}

function escapeMarkdownText(value: string): string {
  return value.replace(/([\\`*_[\]{}()#+\-.!|<>])/g, '\\$1')
}

export function formatLuckMarkdown(data: LuckData): string {
  return `# 今日运势\n\n## ${escapeMarkdownText(data.category)}\n\n> ${escapeMarkdownText(data.tip)}\n\n**运势值：** ${data.rank}\n\n类别 ID：${data.id} · 提示 ID：${data.tip_index}`
}
