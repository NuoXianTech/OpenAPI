import { stat } from "fs";
import { H3Event } from "h3";
import { apiService } from "~~/server/service/apiService";
import { report } from "~~/server/utils/report";

export default defineEventHandler(async (event: H3Event) => {
  // 定义一份测试数据
  const data = await apiService.getApi();

  return report(event, 200, "测试接口调用成功！", data);
});
