import { stat } from "fs";
import { H3Event } from "h3";
import { testApiService } from "~~/server/service/testApi";
import { report } from "~~/server/utils/report";

export default defineEventHandler(async (event: H3Event) => {
  // 定义一份测试数据
  const data = await testApiService.getApi();

  return report(event, 200, "测试接口调用成功！", data);
});
