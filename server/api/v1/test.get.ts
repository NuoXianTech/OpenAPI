export default defineEventHandler(async (event) => {
  return { code: 0, message: "测试接口调用成功！" };
});

// TODO: 应当使用 路由 来进行对API的版本管理