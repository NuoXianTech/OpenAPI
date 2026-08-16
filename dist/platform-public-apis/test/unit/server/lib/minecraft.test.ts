import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  classifyMinecraftError,
  createMinecraftInputError,
  getMinecraftProfile,
  normalizeMinecraftIdentifier,
  parseMinecraftOutputType
} from '~~/server/lib/minecraft'

const sharedCacheMocks = vi.hoisted(() => ({
  getSharedCache: vi.fn(async (options: { loader: () => Promise<unknown> }) => options.loader())
}))

const safeFetchMocks = vi.hoisted(() => ({
  safeFetch: vi.fn(),
  readLimitedText: vi.fn((response: Response) => response.text())
}))

vi.mock('~~/server/utils/shared-cache', () => ({
  getSharedCache: sharedCacheMocks.getSharedCache
}))

vi.mock('~~/server/utils/safe-fetch', () => ({
  safeFetch: safeFetchMocks.safeFetch,
  readLimitedText: safeFetchMocks.readLimitedText
}))

afterEach(() => {
  vi.clearAllMocks()
})

const NOTCH_UUID = '069a79f444e94726a5befca90e38aaf5'

function createTextureProperty(options: { cape?: boolean, model?: 'slim' } = {}) {
  const texturePayload = {
    timestamp: 1786100000000,
    profileId: NOTCH_UUID,
    profileName: 'Notch',
    textures: {
      SKIN: {
        url: 'http://textures.minecraft.net/texture/skin-hash',
        ...(options.model ? { metadata: { model: options.model } } : {})
      },
      ...(options.cape
        ? { CAPE: { url: 'https://textures.minecraft.net/texture/cape-hash' } }
        : {})
    }
  }
  return {
    name: 'textures',
    value: Buffer.from(JSON.stringify(texturePayload)).toString('base64'),
    signature: 'signed-property'
  }
}

function createSessionResponse(options: { cape?: boolean, model?: 'slim' } = {}): Response {
  return new Response(JSON.stringify({
    id: NOTCH_UUID,
    name: 'Notch',
    properties: [createTextureProperty(options)]
  }))
}

describe('Minecraft input', () => {
  it('accepts usernames and normalizes compact or dashed UUIDs', () => {
    expect(normalizeMinecraftIdentifier(' Notch ')).toBe('Notch')
    expect(normalizeMinecraftIdentifier(NOTCH_UUID.toUpperCase())).toBe(NOTCH_UUID)
    expect(normalizeMinecraftIdentifier('069a79f4-44e9-4726-a5be-fca90e38aaf5')).toBe(NOTCH_UUID)
    expect(normalizeMinecraftIdentifier('bad name')).toBeNull()
    expect(normalizeMinecraftIdentifier('ab')).toBeNull()
  })

  it('normalizes output types and keeps compatibility aliases', () => {
    expect(parseMinecraftOutputType('')).toBe('json')
    expect(parseMinecraftOutputType('SKIN')).toBe('skin')
    expect(parseMinecraftOutputType('skin_url')).toBe('skin')
    expect(parseMinecraftOutputType('skin_cloak')).toBe('cape')
    expect(parseMinecraftOutputType('image')).toBeNull()
  })

  it('classifies input errors as protocol failures', () => {
    expect(classifyMinecraftError(createMinecraftInputError('INVALID_ID'))).toMatchObject({
      status: 400,
      code: 'INVALID_ID',
      biz: false
    })
  })
})

describe('getMinecraftProfile', () => {
  it('combines username lookup and session textures', async () => {
    safeFetchMocks.safeFetch
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: NOTCH_UUID, name: 'Notch' })))
      .mockResolvedValueOnce(createSessionResponse({ cape: true, model: 'slim' }))

    const data = await getMinecraftProfile('Notch')

    expect(data).toEqual({
      name: 'Notch',
      uuid: NOTCH_UUID,
      texture_timestamp: 1786100000000,
      skin: {
        url: 'https://textures.minecraft.net/texture/skin-hash',
        model: 'slim'
      },
      cape: { url: 'https://textures.minecraft.net/texture/cape-hash' }
    })
    expect(safeFetchMocks.safeFetch).toHaveBeenCalledTimes(2)
    expect(safeFetchMocks.safeFetch.mock.calls[0]?.[0].toString())
      .toBe('https://api.mojang.com/users/profiles/minecraft/Notch')
    expect(safeFetchMocks.safeFetch.mock.calls[1]?.[0].toString())
      .toBe(`https://sessionserver.mojang.com/session/minecraft/profile/${NOTCH_UUID}?unsigned=true`)
    expect(sharedCacheMocks.getSharedCache).toHaveBeenCalledWith(expect.objectContaining({
      key: 'cache:minecraft:profile:notch',
      ttlSeconds: 300
    }))
  })

  it('queries the session server directly for UUIDs and defaults to the classic model', async () => {
    safeFetchMocks.safeFetch.mockResolvedValueOnce(createSessionResponse())

    const data = await getMinecraftProfile(NOTCH_UUID)

    expect(data.skin?.model).toBe('classic')
    expect(data.cape).toBeNull()
    expect(safeFetchMocks.safeFetch).toHaveBeenCalledOnce()
  })

  it('maps missing players to a stable business error', async () => {
    safeFetchMocks.safeFetch.mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Not Found' }), { status: 404 }))

    let thrown: unknown
    try {
      await getMinecraftProfile('MissingPlayer')
    } catch (error) {
      thrown = error
    }

    expect(classifyMinecraftError(thrown)).toMatchObject({
      status: 404,
      code: 'PLAYER_NOT_FOUND',
      biz: true
    })
  })

  it('reports non-JSON upstream failures by HTTP status', async () => {
    safeFetchMocks.safeFetch.mockResolvedValueOnce(new Response('<h1>Unavailable</h1>', { status: 503 }))

    await expect(getMinecraftProfile('Notch')).rejects.toMatchObject({
      code: 'UPSTREAM_ERROR',
      message: 'Mojang Profile API 返回 HTTP 503'
    })
  })

  it('rejects malformed texture data and non-Mojang texture hosts', async () => {
    safeFetchMocks.safeFetch.mockResolvedValueOnce(new Response(JSON.stringify({
      id: NOTCH_UUID,
      name: 'Notch',
      properties: [{ name: 'textures', value: 'not-json' }]
    })))
    await expect(getMinecraftProfile(NOTCH_UUID)).rejects.toMatchObject({ code: 'UPSTREAM_INVALID_RESPONSE' })

    const maliciousTexture = Buffer.from(JSON.stringify({
      timestamp: 1786100000000,
      textures: { SKIN: { url: 'https://example.com/texture/skin-hash' } }
    })).toString('base64')
    safeFetchMocks.safeFetch.mockResolvedValueOnce(new Response(JSON.stringify({
      id: NOTCH_UUID,
      name: 'Notch',
      properties: [{ name: 'textures', value: maliciousTexture }]
    })))
    await expect(getMinecraftProfile(NOTCH_UUID)).rejects.toMatchObject({ code: 'UPSTREAM_INVALID_RESPONSE' })
  })

  it('rejects mismatched profile UUIDs', async () => {
    safeFetchMocks.safeFetch.mockResolvedValueOnce(new Response(JSON.stringify({
      id: '853c80ef3c3749fdaa49938b674adae6',
      name: 'Notch',
      properties: [createTextureProperty()]
    })))

    await expect(getMinecraftProfile(NOTCH_UUID)).rejects.toMatchObject({ code: 'UPSTREAM_INVALID_RESPONSE' })
  })
})
