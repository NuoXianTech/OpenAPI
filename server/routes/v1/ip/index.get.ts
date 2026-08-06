/**
 * GET /v1/ip · 使用本地 CZDB 查询 IPv4 / IPv6 归属地。
 *
 * Query:
 *   ip  可选；未提供时使用平台可信代理策略解析出的客户端 IP
 */

import { isIP } from 'node:net'
import {
  IpLookupError,
  lookupIpLocation
} from '~~/server/lib/ip'
import { getIpDatabaseKey } from '~~/server/lib/ip/capability-config'
import { readQueryString } from '~~/server/utils/request-query'

export default defineOpenApiEventHandler(async (_event, api) => {
  api.setHeaders({ 'cache-control': 'no-store' })

  const explicitIp = readQueryString(api.query.ip).trim()
  const ip = explicitIp || api.clientIp
  if (!ip) {
    return api.fail(400, 'IP_REQUIRED', '请提供 ip 参数，或检查客户端 IP 来源配置')
  }
  if (isIP(ip) === 0) {
    return api.fail(400, 'INVALID_IP', 'ip 必须是有效的 IPv4 或 IPv6 地址')
  }

  try {
    const data = await lookupIpLocation(ip, await getIpDatabaseKey())
    if (!data) return api.businessFail(404, 'IP_NOT_FOUND', '未找到该 IP 的归属地信息')
    return api.ok(data, 'IP 归属地查询成功')
  } catch (error) {
    if (error instanceof IpLookupError) {
      if (error.code === 'IP_DATABASE_NOT_CONFIGURED') {
        return api.businessFail(503, error.code, 'IP 数据库尚未配置')
      }
      console.error('[ip] CZDB lookup failed', {
        error: error.cause instanceof Error ? error.cause.message : error.message
      })
      return api.businessFail(503, error.code, 'IP 数据库暂时不可用')
    }
    console.error('[ip] unexpected lookup failure', {
      error: error instanceof Error ? error.message : String(error)
    })
    return api.businessFail(500, 'IP_LOOKUP_FAILED', 'IP 归属地查询失败')
  }
})
