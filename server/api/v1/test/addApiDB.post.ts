import { H3Event } from "h3";
import { testApiService } from "~~/server/service/testApi";

export default defineEventHandler(async (event: H3Event) => {
  const body = await readBody(event);

  const addData = await testApiService.addApi(
    body.name,
    body.description,
    body.docurl,
    body.url,
    body.method,
    body.status,
  );

  return report(event, 200, "新增接口成功！", addData);
});
