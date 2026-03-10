import { stat } from 'fs'
import type { H3Event } from 'h3'
import { report } from '~~/server/utils/report'

export default defineEventHandler(async (event: H3Event) => {
  // 定义一份测试数据
  const data = [
    {
      id: 1,
      code: 'test1',
      name: '接口测试1',
      status: 1,
      short_desc: '这是接口测试1的简短描述',
      description: '这是接口测试1的完整信息完整信息完整信息完整信息完整信息完整信息完整信息完整信息',
      http_method: 'GET,POST',
      api_path: '/api/v1/test1',
      doc_url: 'https://test1/doc',
      is_enabled: true,
      is_api_key: false,
      is_statistics: true,
    },
    {
      id: 2,
      code: 'test2',
      name: '接口测试2',
      status: 0,
      short_desc: '这是接口测试2的简短描述',
      description: '这是接口测试2的完整信息完整信息完整信息完整信息完整信息完整信息完整信息完整信息',
      http_method: 'GET',
      api_path: '/api/v1/test2',
      doc_url: 'https://test2/doc',
      is_enabled: true,
      is_api_key: true,
      is_statistics: true,
    },
  ]

  return report(event, 200, '测试接口调用成功！', data)
})
