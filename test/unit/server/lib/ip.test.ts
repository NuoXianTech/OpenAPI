import { createCipheriv } from 'node:crypto'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { CzdbSearcher, ipAddressToBuffer, type CzdbIpVersion } from '~~/server/lib/ip/czdb'
import {
  clearIpDatabaseCache,
  lookupIpLocation,
  parseCzdbRegion,
  type IpLookupError
} from '~~/server/lib/ip'

interface FixtureOptions {
  version: CzdbIpVersion
  key: string
  raw?: string
  geoColumns?: string[]
  isp?: string
  expired?: boolean
}

const tempDirectories: string[] = []

afterEach(async () => {
  clearIpDatabaseCache()
  await Promise.all(tempDirectories.splice(0).map(path => rm(path, { recursive: true, force: true })))
})

function encodeInteger(value: number): Buffer {
  if (value <= 0x7f) return Buffer.from([value])
  const encoded = Buffer.alloc(5)
  encoded[0] = 0xce
  encoded.writeUInt32BE(value >>> 0, 1)
  return encoded
}

function encodeString(value: string): Buffer {
  const text = Buffer.from(value, 'utf8')
  if (text.length <= 31) return Buffer.concat([Buffer.from([0xa0 | text.length]), text])
  if (text.length <= 0xff) return Buffer.concat([Buffer.from([0xd9, text.length]), text])
  const header = Buffer.alloc(3)
  header[0] = 0xda
  header.writeUInt16BE(text.length, 1)
  return Buffer.concat([header, text])
}

function encodeStringArray(values: string[]): Buffer {
  if (values.length > 15) throw new Error('Fixture supports at most 15 strings')
  return Buffer.concat([Buffer.from([0x90 | values.length]), ...values.map(encodeString)])
}

function xor(data: Buffer, key: Buffer): Buffer {
  return Buffer.from(data.map((value, index) => value ^ key[index % key.length]!))
}

function wrapFixtureDatabase(base: Buffer, key: Buffer, expired = false): Buffer {
  const clientId = 1
  const expiry = expired ? 10101 : 991231
  const decrypted = Buffer.alloc(16)
  decrypted.writeUInt32LE(((clientId << 20) | expiry) >>> 0, 0)
  const cipher = createCipheriv('aes-128-ecb', key, null)
  const encrypted = Buffer.concat([cipher.update(decrypted), cipher.final()])
  const hyperHeader = Buffer.alloc(12)
  hyperHeader.writeUInt32LE(20260801, 0)
  hyperHeader.writeUInt32LE(clientId, 4)
  hyperHeader.writeUInt32LE(encrypted.length, 8)
  return Buffer.concat([hyperHeader, encrypted, base])
}

function buildFixture(options: FixtureOptions): Buffer {
  const key = Buffer.from(options.key, 'base64')
  const blockLength = options.version === 4 ? 13 : 37
  const firstIndexPointer = 17 + 20
  const columnSelectionPointer = firstIndexPointer + blockLength
  const geoMap = options.geoColumns ? encodeStringArray(options.geoColumns) : Buffer.alloc(0)
  const columnSelection = options.geoColumns
    ? options.geoColumns.reduce((bits, _value, index) => bits | (1 << (index + 1)), 0)
    : 0
  const geoSection = columnSelection === 0
    ? Buffer.alloc(4)
    : (() => {
        const section = Buffer.alloc(8 + geoMap.length)
        section.writeUInt32LE(columnSelection, 0)
        section.writeUInt32LE(geoMap.length, 4)
        xor(geoMap, key).copy(section, 8)
        return section
      })()
  const geoPointerAndSize = options.geoColumns ? (geoMap.length << 24) >>> 0 : 0
  const dataBlock = Buffer.concat([
    encodeInteger(geoPointerAndSize),
    encodeString(options.geoColumns ? (options.isp ?? '') : (options.raw ?? ''))
  ])
  const dataPointer = columnSelectionPointer + geoSection.length
  const baseFileSize = dataPointer + dataBlock.length

  const superPart = Buffer.alloc(17)
  superPart[0] = options.version === 4 ? 0 : 1
  superPart.writeUInt32LE(baseFileSize, 1)
  superPart.writeUInt32LE(firstIndexPointer, 5)
  superPart.writeUInt32LE(20, 9)
  superPart.writeUInt32LE(firstIndexPointer, 13)

  const headerBlock = Buffer.alloc(20)
  headerBlock.writeUInt32LE(firstIndexPointer, 16)

  const indexBlock = Buffer.alloc(blockLength)
  const byteLength = options.version === 4 ? 4 : 16
  indexBlock.fill(0, 0, byteLength)
  indexBlock.fill(0xff, byteLength, byteLength * 2)
  indexBlock.writeUInt32LE(dataPointer, byteLength * 2)
  indexBlock[byteLength * 2 + 4] = dataBlock.length

  const base = Buffer.concat([superPart, headerBlock, indexBlock, geoSection, dataBlock])
  expect(base.length).toBe(baseFileSize)
  return wrapFixtureDatabase(base, key, options.expired)
}

function buildTwoRecordIpv4Fixture(keyValue: string): Buffer {
  const key = Buffer.from(keyValue, 'base64')
  const blockLength = 13
  const firstIndexPointer = 17 + 20
  const lastIndexPointer = firstIndexPointer + blockLength
  const columnSelectionPointer = lastIndexPointer + blockLength
  const firstData = Buffer.concat([encodeInteger(0), encodeString('前半段')])
  const secondData = Buffer.concat([encodeInteger(0), encodeString('后半段')])
  const firstDataPointer = columnSelectionPointer + 4
  const secondDataPointer = firstDataPointer + firstData.length
  const baseFileSize = secondDataPointer + secondData.length

  const superPart = Buffer.alloc(17)
  superPart.writeUInt32LE(baseFileSize, 1)
  superPart.writeUInt32LE(firstIndexPointer, 5)
  superPart.writeUInt32LE(20, 9)
  superPart.writeUInt32LE(lastIndexPointer, 13)

  const headerBlock = Buffer.alloc(20)
  headerBlock.writeUInt32LE(firstIndexPointer, 16)

  const firstIndex = Buffer.alloc(blockLength)
  firstIndex.fill(0, 0, 4)
  Buffer.from([0x7f, 0xff, 0xff, 0xff]).copy(firstIndex, 4)
  firstIndex.writeUInt32LE(firstDataPointer, 8)
  firstIndex[12] = firstData.length

  const secondIndex = Buffer.alloc(blockLength)
  Buffer.from([0x80, 0, 0, 0]).copy(secondIndex, 0)
  secondIndex.fill(0xff, 4, 8)
  secondIndex.writeUInt32LE(secondDataPointer, 8)
  secondIndex[12] = secondData.length

  const base = Buffer.concat([
    superPart,
    headerBlock,
    firstIndex,
    secondIndex,
    Buffer.alloc(4),
    firstData,
    secondData
  ])
  expect(base.length).toBe(baseFileSize)
  return wrapFixtureDatabase(base, key)
}

async function createFixtureDirectory(options: FixtureOptions): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'openapi-czdb-'))
  tempDirectories.push(directory)
  const filename = options.version === 4 ? 'cz88_public_v4.czdb' : 'cz88_public_v6.czdb'
  await writeFile(join(directory, filename), buildFixture(options))
  return directory
}

describe('CZDB IP lookup', () => {
  const key = Buffer.from('fixture-key-1234').toString('base64')

  it('converts IPv4, compressed IPv6 and embedded IPv4 addresses', () => {
    expect(ipAddressToBuffer('8.8.8.8').toString('hex')).toBe('08080808')
    expect(ipAddressToBuffer('2001:db8::1').toString('hex')).toBe('20010db8000000000000000000000001')
    expect(ipAddressToBuffer('::ffff:192.0.2.1').toString('hex')).toBe('00000000000000000000ffffc0000201')
    expect(() => ipAddressToBuffer('999.1.1.1')).toThrow('Invalid IP address')
  })

  it('searches a direct IPv4 record including 0.0.0.0', async () => {
    const raw = '美国–加利福尼亚州–圣克拉拉–山景城\t谷歌公司DNS服务器'
    const directory = await createFixtureDirectory({ version: 4, key, raw })
    const searcher = await CzdbSearcher.open(join(directory, 'cz88_public_v4.czdb'), 4, key)

    await expect(searcher.search('0.0.0.0')).resolves.toEqual({ raw, databaseVersion: 20260801 })
    await expect(searcher.search('255.255.255.255')).resolves.toEqual({ raw, databaseVersion: 20260801 })
    await expect(searcher.search('::1')).rejects.toThrow('cannot be searched')
  })

  it('searches the final record in a multi-block header range', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'openapi-czdb-'))
    tempDirectories.push(directory)
    const databasePath = join(directory, 'cz88_public_v4.czdb')
    await writeFile(databasePath, buildTwoRecordIpv4Fixture(key))
    const searcher = await CzdbSearcher.open(databasePath, 4, key)

    await expect(searcher.search('1.1.1.1')).resolves.toMatchObject({ raw: '前半段' })
    await expect(searcher.search('200.1.1.1')).resolves.toMatchObject({ raw: '后半段' })
  })

  it('decodes geo-map columns and returns normalized IPv6 data', async () => {
    const directory = await createFixtureDirectory({
      version: 6,
      key,
      geoColumns: ['中国', '浙江', '杭州', '西湖区'],
      isp: '中国电信'
    })

    await expect(lookupIpLocation('::', key, directory)).resolves.toEqual({
      ip: '::',
      ip_version: 'ipv6',
      country_name: '中国',
      region_name: '浙江',
      city_name: '杭州',
      district_name: '西湖区',
      internet_service_provider: '中国电信',
      database_version: 20260801
    })
    await expect(lookupIpLocation('::ffff:192.0.2.1', key, directory)).resolves.toMatchObject({
      ip_version: 'ipv6',
      country_name: '中国'
    })
  })

  it('parses direct CZDB output with partial locations', () => {
    expect(parseCzdbRegion('中国–江苏–南京\t南京信风网络科技有限公司')).toEqual({
      countryName: '中国',
      regionName: '江苏',
      cityName: '南京',
      districtName: null,
      internetServiceProvider: '南京信风网络科技有限公司'
    })
    expect(parseCzdbRegion('澳大利亚\tAPNIC/CloudFlare公共DNS服务器')).toMatchObject({
      countryName: '澳大利亚',
      regionName: null,
      internetServiceProvider: 'APNIC/CloudFlare公共DNS服务器'
    })
    expect(parseCzdbRegion('')).toBeNull()
  })

  it('fails safely for missing configuration, bad keys and expired files', async () => {
    await expect(lookupIpLocation('8.8.8.8', ''))
      .rejects.toMatchObject<IpLookupError>({ code: 'IP_DATABASE_NOT_CONFIGURED' })

    const directory = await createFixtureDirectory({ version: 4, key, raw: '测试', expired: true })
    await expect(lookupIpLocation('8.8.8.8', key, directory))
      .rejects.toMatchObject<IpLookupError>({ code: 'IP_DATABASE_UNAVAILABLE' })
    await expect(lookupIpLocation(
      '8.8.8.8',
      Buffer.from('wrong-key-123456').toString('base64'),
      directory
    )).rejects.toMatchObject<IpLookupError>({ code: 'IP_DATABASE_UNAVAILABLE' })
  })
})
