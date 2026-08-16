import type { MaoyanGlobalData, MaoyanRealtimeData, MaoyanRealtimeType } from './index'

function formatNow(): string {
  return new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(Date.now())
}

export function formatMaoyanGlobalText(data: MaoyanGlobalData): string {
  const rows = data.list.slice(0, 20).map(item => `${item.rank}. ${item.movie_name} (${item.release_year}) - ${item.box_office_desc}`).join('\n')
  return `全球电影票房总榜（猫眼）\n\n${rows}\n\n${data.tip}`
}

export function formatMaoyanGlobalMarkdown(data: MaoyanGlobalData): string {
  const rows = data.list.slice(0, 20).map(item => `| ${item.rank} | ${item.movie_name} | ${item.release_year} | ${item.box_office_desc} |`).join('\n')
  const tip = data.tip ? `> ${data.tip}\n\n` : ''
  return `# 🎬 全球电影票房总榜\n\n| 排名 | 电影名称 | 上映年份 | 票房 |\n|------|----------|----------|------|\n${rows}\n\n${tip}*更新时间: ${data.update_time}*\n\n*数据来源: 猫眼专业版*`
}

export function formatMaoyanRealtimeText(type: MaoyanRealtimeType, data: MaoyanRealtimeData): string {
  if (type === 'movie' && data?.movie) {
    const rows = data.movie.list.slice(0, 20).map((item, index) => `${index + 1}. ${item.movie_name} - ${item.box_office_desc}/${item.release_info}`).join('\n')
    return `今日实时票房排行 (${formatNow()})\n\n${rows}\n\n数据来源：猫眼专业版`
  }
  if (type === 'tv' && data?.tv) {
    const rows = data.tv.list.slice(0, 20).map((item, index) => `${index + 1}. ${item.programme_name} - ${item.channel_name}/${item.market_rate.toFixed(2)}%`).join('\n')
    return `今日实时电视收视排行 (${formatNow()})\n\n${rows}\n\n数据来源：猫眼专业版`
  }
  if (type === 'web' && data?.web) {
    const rows = data.web.list.slice(0, 20).map((item, index) => `${index + 1}. ${item.series_name} - ${item.curr_heat_desc}/${item.release_info}`).join('\n')
    return `今日实时网播热度排行 (${formatNow()})\n\n${rows}\n\n数据来源：猫眼专业版`
  }
  throw new Error('猫眼上游返回了不匹配的数据类型')
}

export function formatMaoyanRealtimeMarkdown(type: MaoyanRealtimeType, data: MaoyanRealtimeData): string {
  if (type === 'movie' && data?.movie) {
    const rows = data.movie.list.slice(0, 20).map((item, index) => `| ${index + 1} | ${item.movie_name} | ${item.box_office_desc} | ${item.release_info} |`).join('\n')
    return `# 🎬 今日实时票房排行\n\n*更新时间: ${formatNow()}*\n\n| 排名 | 电影名称 | 实时票房 | 上映信息 |\n|------|----------|----------|----------|\n${rows}\n\n*数据来源: 猫眼专业版*`
  }
  if (type === 'tv' && data?.tv) {
    const rows = data.tv.list.slice(0, 20).map((item, index) => `| ${index + 1} | ${item.programme_name} | ${item.channel_name} | ${item.market_rate.toFixed(2)}% |`).join('\n')
    return `# 📺 今日实时电视收视排行\n\n*更新时间: ${formatNow()}*\n\n| 排名 | 节目名称 | 频道 | 收视率 |\n|------|----------|------|--------|\n${rows}\n\n*数据来源: 猫眼专业版*`
  }
  if (type === 'web' && data?.web) {
    const rows = data.web.list.slice(0, 20).map((item, index) => `| ${index + 1} | ${item.series_name} | ${item.curr_heat_desc} | ${item.release_info} |`).join('\n')
    return `# 🌐 今日实时网播热度排行\n\n*更新时间: ${formatNow()}*\n\n| 排名 | 剧集名称 | 当前热度 | 上映信息 |\n|------|----------|----------|----------|\n${rows}\n\n*数据来源: 猫眼专业版*`
  }
  throw new Error('猫眼上游返回了不匹配的数据类型')
}
