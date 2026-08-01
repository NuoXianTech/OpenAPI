import { IP_CAPABILITY_KEY } from '~~/server/api-capabilities/v1/ip'
import { loadApiCapabilityString } from '~~/server/lib/api-capabilities/runtime'

export function getIpDatabaseKey(): Promise<string> {
  return loadApiCapabilityString('v1', 'ip', IP_CAPABILITY_KEY.databaseKey)
}
