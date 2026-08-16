import crypto from 'node:crypto'
import { Buffer } from 'node:buffer'
import { create } from 'fontkit'
import numCommandsMap from './num-commands.json'

function formatTimestamp(timestamp: number): string {
  return new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(timestamp).replaceAll('/', '-')
}

const utils = {
  parseQueryString: (qs: string) => Object.fromEntries(new URLSearchParams(qs).entries()),
  md5: (input: string) => crypto.createHash('md5').update(input, 'utf8').digest('hex'),
  base64: (str: string) => Buffer.from(str, 'utf-8').toString('base64'),
}

const getMygsig = (path: string, qs: string, body?: Record<string, unknown>) => {
  const payload = {
    ...utils.parseQueryString(qs),
    ...(body ? { myg_body_data: body } : {}),
    path,
  }

  const sortedStr = Object.entries(payload)
    .toSorted((a, b) => a[0].toLowerCase().localeCompare(b[0].toLowerCase()))
    .map(([_, v]) => (typeof v === 'object' ? JSON.stringify(v) : v))
    .join('_')

  const ts = Date.now()

  return JSON.stringify({
    m1: '0.0.3',
    m2: 0,
    m3: '0.0.67_tool',
    ms1: utils.md5(`581409236#${sortedStr}$${ts}`),
    ts,
    ts1: ts - Math.random() * 3_000,
  })
}

const getParams = () => {
  const fixedParams = { method: 'GET', key: 'A013F70DB97834C0A5492378BD76C53A' }

  const signData: Record<string, string | number> = {
    'timeStamp': Date.now(),
    'User-Agent': utils.base64('Mozilla/5.0 Chrome/147.0.0.0 Safari/537.36'),
    'index': Math.floor(Math.random() * 1000 + 1),
    'channelId': 40009,
    'sVersion': 2,
  }

  const signKey = utils.md5(new URLSearchParams({ ...fixedParams, ...signData }).toString().replace(/\s+/g, ' '))

  return new URLSearchParams({ ...signData, signKey })
}

export const fetchBoxOfficeByType = async (type: 'movie' | 'tv' | 'web', date?: string, signal?: AbortSignal) => {
  const params = getParams()

  if (date) {
    params.set('showDate', date.replaceAll('-', ''))
  }

  const PATH_MAP: Record<'movie' | 'tv' | 'web', string> = {
    movie: '/i/api/dashboard-ajax/movie',
    tv: '/i/api/dashboard/getTVData',
    web: '/i/api/dashboard/webHeatData',
  }

  const url = `https://piaofang.maoyan.com${PATH_MAP[type]}?${params}`

  const res = await fetch(url, {
    headers: { mygsig: getMygsig(PATH_MAP[type], params.toString()) },
    signal: signal ?? AbortSignal.timeout(15_000),
  })
  if (!res.ok) throw new Error(`猫眼上游返回 HTTP ${res.status}`)
  const payload = await res.json() as unknown
  if (!isRecord(payload)) throw new Error('猫眼上游返回了无效数据')
  const data = transformRes(payload) as DashboardRes

  return transformFormat(await processFontEncoding(data, signal))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function transformRes(data: Record<string, unknown>): Partial<DashboardRes> {
  const output: Partial<DashboardRes> = {}
  if (data.calendar) output.calendar = data.calendar as DashboardRes['calendar']
  if (data.tvListAll) {
    const tvListAll = data.tvListAll as { data: DashboardRes['tvList']['data'] }
    output.tvList = { status: true, data: tvListAll.data }
  }
  if (data.dataList) output.webList = { status: true, data: data.dataList as DashboardRes['webList']['data'] }
  if (data.movieList) output.movieList = { status: true, data: data.movieList as DashboardRes['movieList']['data'] }
  if (typeof data.fontStyle === 'string') output.fontStyle = data.fontStyle
  return output
}
function transformFormat(data: Partial<DashboardRes>) {
  switch (true) {
    case !!data.movieList: {
      return {
        movie: {
          title: data.movieList.data.nationBoxInfo.title,
          show_count_desc: data.movieList.data.nationBoxInfo.showCountDesc,
          view_count_desc: data.movieList.data.nationBoxInfo.viewCountDesc,
          split_box_office: data.movieList.data.nationBoxInfo.nationBoxSplitUnit.num,
          split_box_office_unit: data.movieList.data.nationBoxInfo.nationSplitBoxSplitUnit.unit,
          box_office: data.movieList.data.nationBoxInfo.nationBoxSplitUnit.num,
          box_office_unit: data.movieList.data.nationBoxInfo.nationBoxSplitUnit.unit,
          update_gap_second: data.movieList.data.updateInfo.updateGapSecond,
          updated: formatTimestamp(data.movieList.data.updateInfo.updateTimestamp),
          updated_at: data.movieList.data.updateInfo.updateTimestamp,
          list: data.movieList.data.list.map(item => ({
            movie_id: item.movieInfo.movieId,
            movie_name: item.movieInfo.movieName,
            release_info: item.movieInfo.releaseInfo,

            box_office: item.boxSplitUnit.num,
            box_office_unit: item.boxSplitUnit.unit,
            box_office_desc: `${item.boxSplitUnit.num}${item.boxSplitUnit.unit}`,
            box_office_rate: item.boxRate,

            split_box_office: item.splitBoxSplitUnit.num,
            split_box_office_unit: item.splitBoxSplitUnit.unit,
            split_box_office_desc: `${item.splitBoxSplitUnit.num}${item.splitBoxSplitUnit.unit}`,
            split_box_office_rate: item.splitBoxRate,

            show_count: item.showCount,
            show_count_rate: item.showCountRate,

            avg_show_view: item.avgShowView,
            avg_seat_view: item.avgSeatView,

            sum_box_desc: item.sumBoxDesc,
            sum_split_box_desc: item.sumSplitBoxDesc,
          })),
        },
      }
    }

    case !!data.tvList: {
      return {
        tv: {
          update_gap_second: data.tvList.data.updateInfo.updateGapSecond,
          updated: formatTimestamp(data.tvList.data.updateInfo.updateTimestamp),
          updated_at: data.tvList.data.updateInfo.updateTimestamp,
          list: data.tvList.data.list.map(item => ({
            programme_name: item.programmeName,
            channel_name: item.channelName,
            market_rate: item.marketRate,
            market_rate_desc: item.marketRateDesc,
            attention_rate: item.attentionRate,
            attention_rate_desc: item.attentionRateDesc,
          })),
        },
      }
    }

    case !!data.webList: {
      return {
        web: {
          update_gap_second: data.webList.data.updateInfo.updateGapSecond,
          updated: formatTimestamp(data.webList.data.updateInfo.updateTimestamp),
          updated_at: data.webList.data.updateInfo.updateTimestamp,
          list: data.webList.data.list.map(item => ({
            series_id: item.seriesInfo.seriesId,
            series_name: item.seriesInfo.name,
            release_info: item.seriesInfo.releaseInfo,
            platform_desc: item.seriesInfo.platformDesc,
            platform_txt: item.seriesInfo.platformTxt,
            curr_heat: item.currHeat,
            curr_heat_desc: item.currHeatDesc,
            bar_value: item.barValue,
          })),
        },
      }
    }
  }
}

async function processFontEncoding(data: DashboardRes, signal?: AbortSignal): Promise<DashboardRes> {
  const fontUrl = extractWoffUrl(data.fontStyle)

  if (!fontUrl) {
    return data
  }

  const response = await fetch(fontUrl, { signal: signal ?? AbortSignal.timeout(10_000) })
  if (!response.ok) throw new Error(`猫眼字体上游返回 HTTP ${response.status}`)
  const buffer = Buffer.from(await response.arrayBuffer())
  const font = create(buffer)

  if (font.type !== 'WOFF') {
    throw new Error('Font type is not WOFF')
  }

  const numbers: { unicode: string, num: number }[] = []

  for (const codePoint of font.characterSet) {
    const glyph = font.glyphForCodePoint(codePoint)
    const unicode = `&#x${codePoint.toString(16).toLowerCase().padStart(4, '0')};`
    const commands = glyph.path.commands

    const num
      = numCommandsMap.find(e => e.commandsList.some(e => e.every((e, idx) => e === commands[idx]?.command)))?.num
        ?? null

    if (num !== null) {
      numbers.push({ unicode, num })
    }
  }

  const skipNum = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].find(n => !numbers.find(e => e.num === n)) ?? '*'

  const info = data.movieList.data.nationBoxInfo

  info.nationBoxSplitUnit.num = info.nationBoxSplitUnit.num.replace(/&#x[0-9a-f]{4};/g, (match) => {
    const found = numbers.find(n => n.unicode === match)
    return found ? found.num.toString() : String(skipNum)
  })

  info.nationSplitBoxSplitUnit.num = info.nationSplitBoxSplitUnit.num.replace(/&#x[0-9a-f]{4};/g, (match) => {
    const found = numbers.find(n => n.unicode === match)
    return found ? found.num.toString() : String(skipNum)
  })

  for (const item of data.movieList.data.list) {
    item.boxSplitUnit.num = item.boxSplitUnit.num.replace(/&#x[0-9a-f]{4};/g, (match) => {
      const found = numbers.find(n => n.unicode === match)
      return found ? found.num.toString() : String(skipNum)
    })

    item.splitBoxSplitUnit.num = item.splitBoxSplitUnit.num.replace(/&#x[0-9a-f]{4};/g, (match) => {
      const found = numbers.find(n => n.unicode === match)
      return found ? found.num.toString() : String(skipNum)
    })
  }

  return data
}

function extractWoffUrl(cssString = '') {
  // @font-face{font-family: "mtsi-font";src:url("//s3plus.meituan.net/v1/mss_73a511b8f91f43d0bdae92584ea6330b/font/20a70494.eot");src:url("//s3plus.meituan.net/v1/mss_73a511b8f91f43d0bdae92584ea6330b/font/20a70494.eot?#iefix") format("embedded-opentype"),url("//s3plus.meituan.net/v1/mss_73a511b8f91f43d0bdae92584ea6330b/font/20a70494.woff");}

  // 匹配 url("//...woff") 或 url('//...woff') 格式
  const woffRegex = /url\(["']?(\/\/[^"'()]*\.woff[^"'()]*?)["']?\)/gi
  const match = cssString.match(woffRegex)

  if (match && match.length > 0) {
    // 提取URL并添加https前缀
    const url = match[0]
      .replace(/url\(["']?/, '') // 移除 url(" 或 url('
      .replace(/["']?\)$/, '') // 移除 ") 或 ')
      .trim()

    return url.startsWith('//') ? 'https:' + url : url
  }

  return null
}

export interface DashboardRes {
  movieList: {
    status: boolean
    data: {
      list: {
        avgSeatView: string
        avgShowView: string
        boxRate: string
        boxSplitUnit: {
          num: string
          unit: string
        }
        movieInfo: {
          movieId: number
          movieName: string
          releaseInfo: string
        }
        showCount: number
        showCountRate: string
        splitBoxRate: string
        splitBoxSplitUnit: {
          num: string
          unit: string
        }
        sumBoxDesc: string
        sumSplitBoxDesc: string
      }[]
      nationBoxInfo: {
        nationBoxSplitUnit: {
          num: string
          unit: string
        }
        nationSplitBoxSplitUnit: {
          num: string
          unit: string
        }
        showCountDesc: string
        title: string
        viewCountDesc: string
      }
      updateInfo: {
        updateGapSecond: number
        updateTimestamp: number
      }
    }
  }
  webList: {
    status: boolean
    data: {
      list: {
        barValue: number
        currHeat: number
        currHeatDesc: string
        seriesInfo: {
          name: string
          newSeries: boolean
          platformDesc: string
          platformTxt: number
          releaseInfo: string
          seriesId: number
        }
      }[]
      updateInfo: {
        updateGapSecond: number
        updateTimestamp: number
      }
    }
  }
  tvList: {
    status: boolean
    data: {
      list: {
        attentionRate: number
        attentionRateDesc: string
        channelName: string
        marketRate: number
        marketRateDesc: string
        programmeName: string
      }[]
      updateInfo: {
        updateGapSecond: number
        updateTimestamp: number
      }
    }
  }
  calendar: {
    today: string
    selectMinDate: string
    selectMaxDate: string
    defaultSelect: string
    serverTimestamp: string
    selectDate: string
  }
  // @font-face{font-family: "mtsi-font";src:url("//s3plus.meituan.net/v1/mss_73a511b8f91f43d0bdae92584ea6330b/font/20a70494.eot");src:url("//s3plus.meituan.net/v1/mss_73a511b8f91f43d0bdae92584ea6330b/font/20a70494.eot?#iefix") format("embedded-opentype"),url("//s3plus.meituan.net/v1/mss_73a511b8f91f43d0bdae92584ea6330b/font/20a70494.woff");}
  // @font-face{font-family: "mtsi-font";src:url("//s3plus.meituan.net/v1/mss_73a511b8f91f43d0bdae92584ea6330b/font/432017e7.eot");src:url("//s3plus.meituan.net/v1/mss_73a511b8f91f43d0bdae92584ea6330b/font/432017e7.eot?#iefix") format("embedded-opentype"),url("//s3plus.meituan.net/v1/mss_73a511b8f91f43d0bdae92584ea6330b/font/432017e7.woff");}
  // @font-face{font-family: "mtsi-font";src:url("//s3plus.meituan.net/v1/mss_73a511b8f91f43d0bdae92584ea6330b/font/2a70c44b.eot");src:url("//s3plus.meituan.net/v1/mss_73a511b8f91f43d0bdae92584ea6330b/font/2a70c44b.eot?#iefix") format("embedded-opentype"),url("//s3plus.meituan.net/v1/mss_73a511b8f91f43d0bdae92584ea6330b/font/2a70c44b.woff");}
  // @font-face{font-family: "mtsi-font";src:url("//s3plus.meituan.net/v1/mss_73a511b8f91f43d0bdae92584ea6330b/font/75e5b39d.eot");src:url("//s3plus.meituan.net/v1/mss_73a511b8f91f43d0bdae92584ea6330b/font/75e5b39d.eot?#iefix") format("embedded-opentype"),url("//s3plus.meituan.net/v1/mss_73a511b8f91f43d0bdae92584ea6330b/font/75e5b39d.woff");}
  // @font-face{font-family: "mtsi-font";src:url("//s3plus.meituan.net/v1/mss_73a511b8f91f43d0bdae92584ea6330b/font/e3dfe524.eot");src:url("//s3plus.meituan.net/v1/mss_73a511b8f91f43d0bdae92584ea6330b/font/e3dfe524.eot?#iefix") format("embedded-opentype"),url("//s3plus.meituan.net/v1/mss_73a511b8f91f43d0bdae92584ea6330b/font/e3dfe524.woff");}
  fontStyle: string
  status: boolean
}
