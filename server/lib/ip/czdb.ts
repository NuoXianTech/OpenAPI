/**
 * Minimal CZDB reader for the public IPv4/IPv6 databases.
 *
 * The file layout and BTREE lookup behavior were cross-checked against the
 * official czdb-search-node example. This implementation uses only Node.js
 * built-ins, performs positional async reads, and implements only the small
 * MessagePack subset required by CZDB records.
 */

import { createDecipheriv } from 'node:crypto'
import { open, type FileHandle } from 'node:fs/promises'
import { isIP, isIPv4 } from 'node:net'
import { resolve } from 'node:path'

export type CzdbIpVersion = 4 | 6

export interface CzdbSearchResult {
  raw: string
  databaseVersion: number
}

interface HeaderEntry {
  startIp: Buffer
  pointer: number
}

interface HeaderRange {
  start: number
  end: number
}

const HYPER_HEADER_SIZE = 12
const SUPER_PART_LENGTH = 17
const FILE_SIZE_PTR = 1
const FIRST_INDEX_PTR = 5
const HEADER_BLOCK_PTR = 9
const END_INDEX_PTR = 13
const HEADER_LINE_SIZE = 20

const MAX_ENCRYPTED_HEADER_BYTES = 4 * 1024
const MAX_HEADER_BLOCK_BYTES = 16 * 1024 * 1024
const MAX_GEO_MAP_BYTES = 128 * 1024 * 1024
const MAX_INDEX_WINDOW_BYTES = 16 * 1024 * 1024

function assertSafeRange(value: number, min: number, max: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw new Error(`CZDB ${label} is invalid`)
  }
}

async function readExact(
  handle: FileHandle,
  length: number,
  position: number
): Promise<Buffer> {
  assertSafeRange(length, 0, Number.MAX_SAFE_INTEGER, 'read length')
  assertSafeRange(position, 0, Number.MAX_SAFE_INTEGER, 'read position')

  const buffer = Buffer.alloc(length)
  let offset = 0
  while (offset < length) {
    const { bytesRead } = await handle.read(buffer, offset, length - offset, position + offset)
    if (bytesRead === 0) throw new Error('CZDB file ended unexpectedly')
    offset += bytesRead
  }
  return buffer
}

function decodeKey(value: string): Buffer {
  const normalized = value.trim()
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(normalized) || normalized.length % 4 !== 0) {
    throw new Error('CZDB key must be valid base64')
  }

  const key = Buffer.from(normalized, 'base64')
  if (key.length !== 16) throw new Error('CZDB key must decode to 16 bytes')
  return key
}

function currentDateNumber(): number {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: '2-digit',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts()
  const read = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value ?? ''
  return Number(`${read('year')}${read('month')}${read('day')}`)
}

function decryptHeaderBlock(key: Buffer, encrypted: Buffer): Buffer {
  const decipher = createDecipheriv('aes-128-ecb', key, null)
  decipher.setAutoPadding(true)
  return Buffer.concat([decipher.update(encrypted), decipher.final()])
}

function xorDecrypt(data: Buffer, key: Buffer): Buffer {
  const result = Buffer.allocUnsafe(data.length)
  for (let index = 0; index < data.length; index += 1) {
    result[index] = data[index]! ^ key[index % key.length]!
  }
  return result
}

function indexBlockLength(version: CzdbIpVersion): number {
  return version === 4 ? 13 : 37
}

function compareBytes(left: Buffer, right: Buffer, length: number): number {
  for (let index = 0; index < length; index += 1) {
    const leftByte = left[index]!
    const rightByte = right[index]!
    if (leftByte !== rightByte) return leftByte < rightByte ? -1 : 1
  }
  return 0
}

function parseIpv4(value: string): Buffer {
  return Buffer.from(value.split('.').map(part => Number(part)))
}

function parseIpv6Part(value: string): number[] {
  if (!value) return []

  const tokens = value.split(':')
  const parts: number[] = []
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]!
    if (token.includes('.')) {
      if (index !== tokens.length - 1 || !isIPv4(token)) throw new Error('Invalid embedded IPv4 address')
      const ipv4 = parseIpv4(token)
      parts.push((ipv4[0]! << 8) | ipv4[1]!, (ipv4[2]! << 8) | ipv4[3]!)
      continue
    }
    parts.push(Number.parseInt(token, 16))
  }
  return parts
}

export function ipAddressToBuffer(ip: string): Buffer {
  const version = isIP(ip)
  if (version === 0) throw new Error('Invalid IP address')
  if (version === 4) return parseIpv4(ip)

  const separator = ip.indexOf('::')
  const left = parseIpv6Part(separator >= 0 ? ip.slice(0, separator) : ip)
  const right = parseIpv6Part(separator >= 0 ? ip.slice(separator + 2) : '')
  const missing = separator >= 0 ? 8 - left.length - right.length : 0
  const parts = separator >= 0 ? [...left, ...Array<number>(missing).fill(0), ...right] : left
  if (missing < 0 || parts.length !== 8 || parts.some(part => !Number.isInteger(part) || part < 0 || part > 0xffff)) {
    throw new Error('Invalid IPv6 address')
  }

  const buffer = Buffer.alloc(16)
  parts.forEach((part, index) => buffer.writeUInt16BE(part, index * 2))
  return buffer
}

class MessagePackReader {
  private offset = 0

  constructor(private readonly buffer: Buffer) {}

  private ensure(length: number): void {
    if (length < 0 || this.offset + length > this.buffer.length) {
      throw new Error('CZDB MessagePack value is truncated')
    }
  }

  private byte(): number {
    this.ensure(1)
    return this.buffer[this.offset++]!
  }

  private uint16(): number {
    this.ensure(2)
    const value = this.buffer.readUInt16BE(this.offset)
    this.offset += 2
    return value
  }

  private uint32(): number {
    this.ensure(4)
    const value = this.buffer.readUInt32BE(this.offset)
    this.offset += 4
    return value
  }

  private uint64(): number {
    this.ensure(8)
    const value = this.buffer.readBigUInt64BE(this.offset)
    this.offset += 8
    if (value > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('CZDB MessagePack integer is too large')
    return Number(value)
  }

  readInteger(): number {
    const marker = this.byte()
    if (marker <= 0x7f) return marker
    if (marker >= 0xe0) return marker - 0x100

    switch (marker) {
      case 0xcc:
        return this.byte()
      case 0xcd:
        return this.uint16()
      case 0xce:
        return this.uint32()
      case 0xcf:
        return this.uint64()
      case 0xd0: {
        this.ensure(1)
        const value = this.buffer.readInt8(this.offset)
        this.offset += 1
        return value
      }
      case 0xd1: {
        this.ensure(2)
        const value = this.buffer.readInt16BE(this.offset)
        this.offset += 2
        return value
      }
      case 0xd2: {
        this.ensure(4)
        const value = this.buffer.readInt32BE(this.offset)
        this.offset += 4
        return value
      }
      case 0xd3: {
        this.ensure(8)
        const value = this.buffer.readBigInt64BE(this.offset)
        this.offset += 8
        if (value < BigInt(Number.MIN_SAFE_INTEGER) || value > BigInt(Number.MAX_SAFE_INTEGER)) {
          throw new Error('CZDB MessagePack integer is too large')
        }
        return Number(value)
      }
      default:
        throw new Error('CZDB MessagePack integer type is unsupported')
    }
  }

  readString(): string {
    const marker = this.byte()
    let length: number
    if ((marker & 0xe0) === 0xa0) length = marker & 0x1f
    else if (marker === 0xd9) length = this.byte()
    else if (marker === 0xda) length = this.uint16()
    else if (marker === 0xdb) length = this.uint32()
    else throw new Error('CZDB MessagePack string type is unsupported')

    this.ensure(length)
    const value = this.buffer.toString('utf8', this.offset, this.offset + length)
    this.offset += length
    return value
  }

  readStringArray(): string[] {
    const marker = this.byte()
    let length: number
    if ((marker & 0xf0) === 0x90) length = marker & 0x0f
    else if (marker === 0xdc) length = this.uint16()
    else if (marker === 0xdd) length = this.uint32()
    else throw new Error('CZDB MessagePack array type is unsupported')

    const values: string[] = []
    for (let index = 0; index < length; index += 1) values.push(this.readString())
    return values
  }

  assertDone(): void {
    if (this.offset !== this.buffer.length) throw new Error('CZDB MessagePack value has trailing bytes')
  }
}

function unpackRegion(region: Buffer, geoMapData: Buffer | null, columnSelection: number): string {
  const regionReader = new MessagePackReader(region)
  const geoPositionAndSize = regionReader.readInteger()
  const otherData = regionReader.readString()
  regionReader.assertDone()

  if (!Number.isInteger(geoPositionAndSize) || geoPositionAndSize < 0 || geoPositionAndSize > 0xffffffff) {
    throw new Error('CZDB geo pointer is invalid')
  }
  if (geoPositionAndSize === 0) return otherData
  if (!geoMapData) throw new Error('CZDB geo map is missing')

  const dataLength = Math.floor(geoPositionAndSize / 0x1000000) & 0xff
  const dataPointer = geoPositionAndSize & 0x00ffffff
  if (dataLength === 0 || dataPointer + dataLength > geoMapData.length) {
    throw new Error('CZDB geo map pointer is out of range')
  }

  const geoReader = new MessagePackReader(geoMapData.subarray(dataPointer, dataPointer + dataLength))
  const columns = geoReader.readStringArray()
  geoReader.assertDone()
  const selected = columns.flatMap((value, index) => (
    ((columnSelection >> (index + 1)) & 1) === 1 ? [value.trim() || 'null'] : []
  ))
  return [...selected, otherData].join('\t')
}

export class CzdbSearcher {
  private constructor(
    private readonly filePath: string,
    private readonly baseOffset: number,
    private readonly baseFileSize: number,
    private readonly ipVersion: CzdbIpVersion,
    private readonly databaseVersion: number,
    private readonly headerEntries: HeaderEntry[],
    private readonly lastIndexPointer: number,
    private readonly geoMapData: Buffer | null,
    private readonly columnSelection: number
  ) {}

  static async open(filePath: string, expectedVersion: CzdbIpVersion, keyValue: string): Promise<CzdbSearcher> {
    const resolvedPath = resolve(filePath)
    const key = decodeKey(keyValue)
    const handle = await open(resolvedPath, 'r')

    try {
      const stats = await handle.stat()
      if (!stats.isFile()) throw new Error('CZDB path is not a file')
      if (stats.size < HYPER_HEADER_SIZE + SUPER_PART_LENGTH) throw new Error('CZDB file is too small')

      const hyperHeader = await readExact(handle, HYPER_HEADER_SIZE, 0)
      const databaseVersion = hyperHeader.readUInt32LE(0)
      const clientId = hyperHeader.readUInt32LE(4)
      const encryptedSize = hyperHeader.readUInt32LE(8)
      assertSafeRange(encryptedSize, 16, MAX_ENCRYPTED_HEADER_BYTES, 'encrypted header size')
      if (encryptedSize % 16 !== 0) throw new Error('CZDB encrypted header size is invalid')

      const encrypted = await readExact(handle, encryptedSize, HYPER_HEADER_SIZE)
      const decrypted = decryptHeaderBlock(key, encrypted)
      if (decrypted.length < 8) throw new Error('CZDB decrypted header is too small')

      const clientAndExpiry = decrypted.readUInt32LE(0)
      const decryptedClientId = clientAndExpiry >>> 20
      const expirationDate = clientAndExpiry & 0x000fffff
      const randomSize = decrypted.readUInt32LE(4)
      if (decryptedClientId !== clientId) throw new Error('CZDB key does not match this database')
      if (expirationDate < currentDateNumber()) throw new Error('CZDB database has expired')

      const baseOffset = HYPER_HEADER_SIZE + encryptedSize + randomSize
      assertSafeRange(baseOffset, HYPER_HEADER_SIZE + encryptedSize, stats.size - SUPER_PART_LENGTH, 'header offset')
      const baseFileSize = stats.size - baseOffset
      if (baseFileSize > 0xffffffff) throw new Error('CZDB database is too large')

      const superPart = await readExact(handle, SUPER_PART_LENGTH, baseOffset)
      const ipVersion: CzdbIpVersion = (superPart[0]! & 1) === 0 ? 4 : 6
      if (ipVersion !== expectedVersion) throw new Error(`CZDB database is IPv${ipVersion}, expected IPv${expectedVersion}`)
      if (superPart.readUInt32LE(FILE_SIZE_PTR) !== baseFileSize) throw new Error('CZDB file size does not match its header')

      const firstIndexPointer = superPart.readUInt32LE(FIRST_INDEX_PTR)
      const headerBlockSize = superPart.readUInt32LE(HEADER_BLOCK_PTR)
      const lastIndexPointer = superPart.readUInt32LE(END_INDEX_PTR)
      const blockLength = indexBlockLength(ipVersion)
      assertSafeRange(headerBlockSize, HEADER_LINE_SIZE, MAX_HEADER_BLOCK_BYTES, 'header block size')
      if (headerBlockSize % HEADER_LINE_SIZE !== 0) throw new Error('CZDB header block is misaligned')
      assertSafeRange(firstIndexPointer, SUPER_PART_LENGTH + headerBlockSize, baseFileSize - blockLength, 'first index pointer')
      assertSafeRange(lastIndexPointer, firstIndexPointer, baseFileSize - blockLength, 'last index pointer')
      if ((lastIndexPointer - firstIndexPointer) % blockLength !== 0) throw new Error('CZDB index range is misaligned')

      const headerBlock = await readExact(handle, headerBlockSize, baseOffset + SUPER_PART_LENGTH)
      const headerEntries: HeaderEntry[] = []
      const ipByteLength = ipVersion === 4 ? 4 : 16
      for (let offset = 0; offset < headerBlock.length; offset += HEADER_LINE_SIZE) {
        const pointer = headerBlock.readUInt32LE(offset + 16)
        if (pointer === 0) break
        if (pointer < firstIndexPointer || pointer > lastIndexPointer || (pointer - firstIndexPointer) % blockLength !== 0) {
          throw new Error('CZDB header index pointer is invalid')
        }
        const startIp = Buffer.from(headerBlock.subarray(offset, offset + 16))
        const previous = headerEntries.at(-1)
        if (previous && (
          compareBytes(previous.startIp, startIp, ipByteLength) >= 0
          || previous.pointer >= pointer
        )) {
          throw new Error('CZDB header entries are not strictly ordered')
        }
        headerEntries.push({ startIp, pointer })
      }
      if (headerEntries.length === 0) throw new Error('CZDB header contains no index entries')

      const columnSelectionPointer = lastIndexPointer + blockLength
      if (columnSelectionPointer + 4 > baseFileSize) throw new Error('CZDB column settings exceed the file')
      const columnSelectionBytes = await readExact(handle, 4, baseOffset + columnSelectionPointer)
      const columnSelection = columnSelectionBytes.readUInt32LE(0)
      let geoMapData: Buffer | null = null
      if (columnSelection !== 0) {
        if (columnSelectionPointer + 8 > baseFileSize) throw new Error('CZDB geo settings exceed the file')
        const geoSizeBytes = await readExact(handle, 4, baseOffset + columnSelectionPointer + 4)
        const geoSize = geoSizeBytes.readUInt32LE(0)
        assertSafeRange(geoSize, 1, MAX_GEO_MAP_BYTES, 'geo map size')
        if (columnSelectionPointer + 8 + geoSize > baseFileSize) throw new Error('CZDB geo map exceeds the file')
        geoMapData = xorDecrypt(
          await readExact(handle, geoSize, baseOffset + columnSelectionPointer + 8),
          key
        )
      }

      return new CzdbSearcher(
        resolvedPath,
        baseOffset,
        baseFileSize,
        ipVersion,
        databaseVersion,
        headerEntries,
        lastIndexPointer,
        geoMapData,
        columnSelection
      )
    } finally {
      await handle.close()
    }
  }

  private findHeaderRange(ip: Buffer): HeaderRange | null {
    const byteLength = this.ipVersion === 4 ? 4 : 16
    let low = 0
    let high = this.headerEntries.length - 1

    while (low <= high) {
      const middle = (low + high) >> 1
      const comparison = compareBytes(ip, this.headerEntries[middle]!.startIp, byteLength)
      if (comparison < 0) high = middle - 1
      else if (comparison > 0) low = middle + 1
      else {
        return {
          start: this.headerEntries[middle > 0 ? middle - 1 : middle]!.pointer,
          end: this.headerEntries[middle]!.pointer
        }
      }
    }

    if (low === 0 && high < 0) return null
    if (low < this.headerEntries.length) {
      return {
        start: this.headerEntries[low - 1]!.pointer,
        end: this.headerEntries[low]!.pointer
      }
    }

    return {
      start: this.headerEntries[this.headerEntries.length - 1]!.pointer,
      end: this.lastIndexPointer
    }
  }

  async search(ip: string): Promise<CzdbSearchResult | null> {
    const version = isIP(ip)
    if (version === 0) throw new Error('Invalid IP address')
    if (version !== this.ipVersion) throw new Error(`IPv${version} address cannot be searched in an IPv${this.ipVersion} database`)

    const ipBytes = ipAddressToBuffer(ip)
    const range = this.findHeaderRange(ipBytes)
    if (!range) return null

    const blockLength = indexBlockLength(this.ipVersion)
    const span = range.end - range.start
    assertSafeRange(span, 0, MAX_INDEX_WINDOW_BYTES, 'index window')
    const readLength = span + blockLength
    if (range.start + readLength > this.baseFileSize) throw new Error('CZDB index window is truncated')

    const handle = await open(this.filePath, 'r')
    try {
      const indexBuffer = await readExact(handle, readLength, this.baseOffset + range.start)
      const byteLength = this.ipVersion === 4 ? 4 : 16
      let low = 0
      let high = Math.floor(span / blockLength)
      let dataPointer = 0
      let dataLength = 0

      while (low <= high) {
        const middle = (low + high) >> 1
        const offset = middle * blockLength
        if (offset + blockLength > indexBuffer.length) throw new Error('CZDB index block is truncated')

        const startIp = indexBuffer.subarray(offset, offset + byteLength)
        const endIp = indexBuffer.subarray(offset + byteLength, offset + byteLength * 2)
        const compareStart = compareBytes(ipBytes, startIp, byteLength)
        const compareEnd = compareBytes(ipBytes, endIp, byteLength)
        if (compareStart >= 0 && compareEnd <= 0) {
          dataPointer = indexBuffer.readUInt32LE(offset + byteLength * 2)
          dataLength = indexBuffer[offset + byteLength * 2 + 4]!
          break
        }
        if (compareStart < 0) high = middle - 1
        else low = middle + 1
      }

      if (dataPointer === 0) return null
      if (
        dataLength === 0
        || dataPointer + dataLength > this.baseFileSize
      ) {
        throw new Error('CZDB data pointer is out of range')
      }

      const region = await readExact(handle, dataLength, this.baseOffset + dataPointer)
      return {
        raw: unpackRegion(region, this.geoMapData, this.columnSelection),
        databaseVersion: this.databaseVersion
      }
    } finally {
      await handle.close()
    }
  }
}
