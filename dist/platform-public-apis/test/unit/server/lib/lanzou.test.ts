import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  classifyLanzouError,
  parseLanzouFile,
  parseLanzouShareUrl
} from '~~/server/lib/lanzou'

const safeFetchMocks = vi.hoisted(() => ({
  safeFetch: vi.fn(),
  readLimitedText: vi.fn((response: Response) => response.text())
}))

vi.mock('~~/server/utils/safe-fetch', () => ({
  safeFetch: safeFetchMocks.safeFetch,
  readLimitedText: safeFetchMocks.readLimitedText
}))

afterEach(() => {
  vi.clearAllMocks()
})

const PUBLIC_SHARE_HTML = `
  <div style="font-size: 30px;text-align: center;padding: 56px 0 20px">头像.txt</div>
  <span class="p7">文件大小：</span>30.2 K<br>
  <iframe src="/fn?token=public"></iframe>
`

const PUBLIC_DOWNLOAD_HTML = `
  <script>
    var wp_sign = 'public-sign';
    var ajaxdata = 'web-sign';
    $.ajax({ url: '/ajaxm.php?file=13180693' });
  </script>
`

const PASSWORD_SHARE_HTML = `
  <div class="n_box_3fn" id="filenajax">文件</div>
  <div class="n_filesize">大小：10.3 M</div>
  <script>
    function down_p() {
      $.ajax({
        url: '/ajaxm.php?file=25792756',
        data: { 'action':'downprocess', 'sign':'stale-sign', 'kd':kdns, 'p':pwd }
      });
    }
    function down_p() {
      $.ajax({
        url: '/ajaxm.php?file=25792756',
        data: { 'action':'downprocess', 'sign':'current-sign', 'kd':kdns, 'p':pwd }
      });
    }
  </script>
`

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    headers: { 'content-type': 'application/json' }
  })
}

describe('parseLanzouShareUrl', () => {
  it('maps supported share domains to the canonical host and drops query data', () => {
    expect(parseLanzouShareUrl('https://www.lanzouq.com/iGNHA6th9cd?pwd=secret').toString())
      .toBe('https://www.lanzouf.com/iGNHA6th9cd')
    expect(parseLanzouShareUrl('https://wwfg.lanzoux.com/iAbcde_123').hostname)
      .toBe('www.lanzouf.com')
  })

  it.each([
    'http://www.lanzouq.com/iGNHA6th9cd',
    'https://user:pass@www.lanzouq.com/iGNHA6th9cd',
    'https://www.lanzouq.com:8443/iGNHA6th9cd',
    'https://www.lanzouq.com.evil.test/iGNHA6th9cd',
    'https://example.com/iGNHA6th9cd',
    'https://www.lanzouq.com/not-a-file'
  ])('rejects unsafe or invalid links: %s', (input) => {
    expect(() => parseLanzouShareUrl(input)).toThrow()
    expect(classifyLanzouError(captureError(() => parseLanzouShareUrl(input))).code).toBe('INVALID_URL')
  })

  it('reports folder links as unsupported resources', () => {
    const failure = classifyLanzouError(captureError(() => parseLanzouShareUrl('https://www.lanzouq.com/b012345')))
    expect(failure).toMatchObject({ status: 422, code: 'UNSUPPORTED_RESOURCE', biz: true })
  })
})

describe('parseLanzouFile', () => {
  it('parses a public file and removes pid without changing other parameters', async () => {
    safeFetchMocks.safeFetch
      .mockResolvedValueOnce(new Response(PUBLIC_SHARE_HTML))
      .mockResolvedValueOnce(new Response(PUBLIC_DOWNLOAD_HTML))
      .mockResolvedValueOnce(jsonResponse({
        zt: 1,
        inf: 0,
        dom: 'https://developer2.lanrar.com',
        url: 'signed/file-token?pid=internal-address&fn=avatar.txt'
      }))

    const data = await parseLanzouFile(parseLanzouShareUrl('https://www.lanzouq.com/iGNHA6th9cd'))

    expect(data).toEqual({
      name: '头像.txt',
      size: '30.2 K',
      url: 'https://developer2.lanrar.com/file/signed/file-token?fn=avatar.txt'
    })
    expect(safeFetchMocks.safeFetch).toHaveBeenCalledTimes(3)
    expect(safeFetchMocks.safeFetch.mock.calls[1]?.[0].toString()).toBe('https://www.lanzouf.com/fn?token=public')
    expect(safeFetchMocks.safeFetch.mock.calls[2]?.[1]).toMatchObject({
      method: 'POST',
      allowedHosts: ['lanzouf.com']
    })
    const body = safeFetchMocks.safeFetch.mock.calls[2]?.[1].body as URLSearchParams
    expect(Object.fromEntries(body)).toEqual({
      action: 'downprocess',
      websignkey: 'web-sign',
      signs: 'web-sign',
      sign: 'public-sign',
      websign: '',
      kd: '1',
      ves: '1'
    })
  })

  it('uses the current password-page signature and upstream file name', async () => {
    safeFetchMocks.safeFetch
      .mockResolvedValueOnce(new Response(PASSWORD_SHARE_HTML))
      .mockResolvedValueOnce(jsonResponse({
        zt: 1,
        inf: '徐海俏 - 空.txt',
        dom: 'https://developer2.lanrar.com',
        url: 'signed/password-file'
      }))

    const data = await parseLanzouFile(
      parseLanzouShareUrl('https://www.lanzous.com/i42Xxebssfg'),
      '1234'
    )

    expect(data.name).toBe('徐海俏 - 空.txt')
    expect(data.size).toBe('10.3 M')
    const body = safeFetchMocks.safeFetch.mock.calls[1]?.[1].body as URLSearchParams
    expect(Object.fromEntries(body)).toEqual({
      action: 'downprocess',
      sign: 'current-sign',
      p: '1234',
      kd: '1'
    })
  })

  it('requires a password without sending another upstream request', async () => {
    safeFetchMocks.safeFetch.mockResolvedValueOnce(new Response(PASSWORD_SHARE_HTML))

    const error = await captureAsyncError(() => parseLanzouFile(
      parseLanzouShareUrl('https://www.lanzous.com/i42Xxebssfg')
    ))

    expect(classifyLanzouError(error)).toMatchObject({ status: 400, code: 'PASSWORD_REQUIRED', biz: false })
    expect(safeFetchMocks.safeFetch).toHaveBeenCalledOnce()
  })

  it('maps an invalid password without exposing its value', async () => {
    safeFetchMocks.safeFetch
      .mockResolvedValueOnce(new Response(PASSWORD_SHARE_HTML))
      .mockResolvedValueOnce(jsonResponse({ zt: 0, inf: '密码不正确' }))

    const password = 'do-not-expose'
    const error = await captureAsyncError(() => parseLanzouFile(
      parseLanzouShareUrl('https://www.lanzous.com/i42Xxebssfg'),
      password
    ))
    const failure = classifyLanzouError(error)

    expect(failure).toMatchObject({ status: 422, code: 'INVALID_PASSWORD', biz: true })
    expect(JSON.stringify(failure)).not.toContain(password)
  })

  it('rejects unavailable shares and unexpected download domains', async () => {
    safeFetchMocks.safeFetch.mockResolvedValueOnce(new Response('<div>文件取消分享了</div>'))
    const unavailable = await captureAsyncError(() => parseLanzouFile(
      parseLanzouShareUrl('https://www.lanzouq.com/iGNHA6th9cd')
    ))
    expect(classifyLanzouError(unavailable).code).toBe('SHARE_UNAVAILABLE')

    safeFetchMocks.safeFetch
      .mockResolvedValueOnce(new Response(PUBLIC_SHARE_HTML))
      .mockResolvedValueOnce(new Response(PUBLIC_DOWNLOAD_HTML))
      .mockResolvedValueOnce(jsonResponse({
        zt: 1,
        dom: 'https://internal.example.com',
        url: 'file-token'
      }))
    const invalidDomain = await captureAsyncError(() => parseLanzouFile(
      parseLanzouShareUrl('https://www.lanzouq.com/iGNHA6th9cd')
    ))
    expect(classifyLanzouError(invalidDomain)).toMatchObject({
      status: 502,
      code: 'UPSTREAM_INVALID_RESPONSE'
    })
  })

  it('rejects malformed iframe and download-domain values as invalid upstream data', async () => {
    safeFetchMocks.safeFetch.mockResolvedValueOnce(new Response('<iframe src="https://example.com/file"></iframe>'))
    const malformedIframe = await captureAsyncError(() => parseLanzouFile(
      parseLanzouShareUrl('https://www.lanzouq.com/iGNHA6th9cd')
    ))
    expect(classifyLanzouError(malformedIframe).code).toBe('PARSE_FAILED')

    safeFetchMocks.safeFetch
      .mockResolvedValueOnce(new Response(PUBLIC_SHARE_HTML))
      .mockResolvedValueOnce(new Response(PUBLIC_DOWNLOAD_HTML))
      .mockResolvedValueOnce(jsonResponse({
        zt: 1,
        dom: 'https://developer2.lanrar.com/unexpected?target=other',
        url: 'file-token'
      }))
    const malformedDomain = await captureAsyncError(() => parseLanzouFile(
      parseLanzouShareUrl('https://www.lanzouq.com/iGNHA6th9cd')
    ))
    expect(classifyLanzouError(malformedDomain).code).toBe('UPSTREAM_INVALID_RESPONSE')
  })
})

function captureError(action: () => unknown): unknown {
  try {
    action()
  } catch (error) {
    return error
  }
  throw new Error('expected action to throw')
}

async function captureAsyncError(action: () => Promise<unknown>): Promise<unknown> {
  try {
    await action()
  } catch (error) {
    return error
  }
  throw new Error('expected action to reject')
}
