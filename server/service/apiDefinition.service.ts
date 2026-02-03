import { apiDefinitions } from "../db/schema/api_definitions";

export const apiDefinitionService = {
  async getApi() {
    return await db.select().from(apiDefinitions);
  },
  
  async addApi(
    code: string,
    name: string,
    status: number,
    short_desc: string,
    description: string,
    http_method: string,
    api_path: string,
    doc_url: string,
    is_enabled: boolean,
    is_api_key: boolean,
    is_statistics: boolean,
  ) {
    return await db
      .insert(apiDefinitions)
      .values({
        code: code,
        name: name,
        status: status,
        short_desc: short_desc,
        description: description,
        http_method: http_method,
        api_path: api_path,
        doc_url: doc_url,
        is_enabled: is_enabled,
        is_api_key: is_api_key,
        is_statistics: is_statistics,
      })
      .returning();
  },
};
