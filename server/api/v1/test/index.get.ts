export default defineEventHandler(async (event) => {
  return { code: 0, message: '测试接口调用成功！' }
})

// 添加中间件，进行统计调用次数（例如成功的次数、失败/未知的次数），可以结合数据库进行持久化存储
