import { stat } from "fs";
import { H3Event } from "h3";
import { report } from "~~/server/utils/report";

export default defineEventHandler(async (event: H3Event) => {
  // 定义一份测试数据
  const data = [
    {
      id: 1,
      name: "接口测试1",
      description: "这是接口测试1的描述信息",
      docurl: "https://test1/doc",
      url: "https://test1/api/v1/test",
      method: "GET",
      count: 1000,
      status: 1,
    },
    {
      id: 2,
      name: "接口测试2",
      description: "这是接口测试2的描述信息",
      docurl: "https://test2/doc",
      url: "https://test2/api/v1/test",
      method: "POST",
      count: 2500,
      status: 0,
    },
  ];

  return report(event, 200, "测试接口调用成功！", data);
});
