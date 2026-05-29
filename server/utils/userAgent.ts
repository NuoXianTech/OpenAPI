import Bowser from 'bowser'

/**
 * 把 User-Agent 字符串解析成简短的设备概要（如 "Chrome · Windows"），
 * 供登录日志的「设备」列展示。
 *
 * 基于 bowser（MIT）。只取浏览器名 + 操作系统名、不带版本号，保持简洁。
 * UA 为空或解析失败时回退「未知设备」，绝不抛错（不阻塞日志读取）。
 */
export function summarizeUserAgent(ua: string | null | undefined): string {
  if (!ua) return '未知设备'
  try {
    const parser = Bowser.getParser(ua)
    const browser = parser.getBrowserName() // 'Chrome' / '' （未知时空串）
    const os = parser.getOSName() // 'Windows' / ''
    if (browser && os) return `${browser} · ${os}`
    return browser || os || '未知设备'
  } catch {
    return '未知设备'
  }
}
