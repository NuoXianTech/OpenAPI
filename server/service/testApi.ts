import { testApi } from "../db/schema/testApi";

export const testApiService = {
  async getApi() {
    return await db.select().from(testApi);
  },
  async addApi(
    name: string,
    description: string,
    docurl: string,
    url: string,
    method: string,
    status: number,
  ) {
    return await db
      .insert(testApi)
      .values({
        name: name,
        description: description,
        docurl: docurl,
        url: url,
        method: method,
        status: status,
      })
      .returning();
  },
};
