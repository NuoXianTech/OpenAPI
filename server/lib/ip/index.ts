import { isIP } from 'node:net'
import { resolve } from 'node:path'
import { CzdbSearcher, type CzdbIpVersion } from './czdb'

export interface IpLocationData {
  ip: string
  ip_version: 'ipv4' | 'ipv6'
  country_name: string | null
  region_name: string | null
  city_name: string | null
  district_name: string | null
  internet_service_provider: string | null
  database_version: number
}

export type IpLookupErrorCode = 'IP_DATABASE_NOT_CONFIGURED' | 'IP_DATABASE_UNAVAILABLE'

export class IpLookupError extends Error {
  constructor(
    readonly code: IpLookupErrorCode,
    message: string,
    options?: ErrorOptions
  ) {
    super(message, options)
    this.name = 'IpLookupError'
  }
}

interface ParsedRegion {
  countryName: string | null
  regionName: string | null
  cityName: string | null
  districtName: string | null
  internetServiceProvider: string | null
}

interface SearcherCacheEntry {
  path: string
  key: string
  promise: Promise<CzdbSearcher>
}

const DATABASE_FILENAMES: Record<CzdbIpVersion, string> = {
  4: 'cz88_public_v4.czdb',
  6: 'cz88_public_v6.czdb'
}
export const IP_DATABASE_DIRECTORY = resolve(process.cwd(), 'data', 'ip')
const searcherCache = new Map<CzdbIpVersion, SearcherCacheEntry>()

function nullablePart(value: string | undefined): string | null {
  const normalized = value?.trim() ?? ''
  return normalized && normalized.toLowerCase() !== 'null' ? normalized : null
}

export function parseCzdbRegion(raw: string): ParsedRegion | null {
  const columns = raw.split('\t').map(value => value.trim())
  const first = columns[0] ?? ''
  if (!first && columns.every(value => !value)) return null

  const locationParts = first.split(/[–—]/u).map(value => value.trim())
  let geoParts: string[]
  let ispParts: string[]
  if (locationParts.length > 1) {
    geoParts = locationParts
    ispParts = columns.slice(1)
  } else if (columns.length > 2) {
    geoParts = columns.slice(0, -1)
    ispParts = columns.slice(-1)
  } else {
    geoParts = [first]
    ispParts = columns.slice(1)
  }

  const internetServiceProvider = nullablePart(
    ispParts.map(value => nullablePart(value)).filter(value => value !== null).join(' ')
  )
  return {
    countryName: nullablePart(geoParts[0]),
    regionName: nullablePart(geoParts[1]),
    cityName: nullablePart(geoParts[2]),
    districtName: nullablePart(geoParts.slice(3).map(value => nullablePart(value)).filter(value => value !== null).join('–')),
    internetServiceProvider
  }
}

function normalizeConfig(directory: string, keyValue: string): { directory: string, key: string } {
  const key = keyValue.trim()
  if (!key) {
    throw new IpLookupError(
      'IP_DATABASE_NOT_CONFIGURED',
      'CZDB key is required'
    )
  }
  return { directory: resolve(directory), key }
}

async function getSearcher(
  version: CzdbIpVersion,
  directory: string,
  key: string
): Promise<CzdbSearcher> {
  const normalized = normalizeConfig(directory, key)
  const path = resolve(normalized.directory, DATABASE_FILENAMES[version])
  const cached = searcherCache.get(version)
  if (cached?.path === path && cached.key === normalized.key) return cached.promise

  const promise = CzdbSearcher.open(path, version, normalized.key)
  const entry = { path, key: normalized.key, promise }
  searcherCache.set(version, entry)
  promise.catch(() => {
    if (searcherCache.get(version) === entry) searcherCache.delete(version)
  })
  return promise
}

export function clearIpDatabaseCache(): void {
  searcherCache.clear()
}

export async function lookupIpLocation(
  ip: string,
  key: string,
  directory = IP_DATABASE_DIRECTORY
): Promise<IpLocationData | null> {
  const version = isIP(ip)
  if (version !== 4 && version !== 6) throw new TypeError('Invalid IP address')

  let searcher: CzdbSearcher
  try {
    searcher = await getSearcher(version, directory, key)
  } catch (error) {
    if (error instanceof IpLookupError) throw error
    throw new IpLookupError(
      'IP_DATABASE_UNAVAILABLE',
      `IPv${version} CZDB database is unavailable`,
      { cause: error }
    )
  }

  let result: Awaited<ReturnType<CzdbSearcher['search']>>
  try {
    result = await searcher.search(ip)
  } catch (error) {
    throw new IpLookupError(
      'IP_DATABASE_UNAVAILABLE',
      `IPv${version} CZDB lookup failed`,
      { cause: error }
    )
  }
  if (!result) return null

  const region = parseCzdbRegion(result.raw)
  if (!region) return null
  return {
    ip,
    ip_version: version === 4 ? 'ipv4' : 'ipv6',
    country_name: region.countryName,
    region_name: region.regionName,
    city_name: region.cityName,
    district_name: region.districtName,
    internet_service_provider: region.internetServiceProvider,
    database_version: result.databaseVersion
  }
}
