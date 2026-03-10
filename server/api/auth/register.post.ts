// 注册接口
import type { H3Event } from 'h3'
// import { usersService } from '~~/server/service/userService'

export default defineEventHandler(async (event: H3Event) => {
  const _body = await readBody(event)

  // 在此处添加注册逻辑，例如将用户信息存储到数据库中
})
