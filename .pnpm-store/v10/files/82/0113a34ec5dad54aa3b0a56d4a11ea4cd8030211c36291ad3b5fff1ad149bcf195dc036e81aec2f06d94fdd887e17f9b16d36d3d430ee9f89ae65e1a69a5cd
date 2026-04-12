import { eventHandler, getQuery } from "h3";
import { startStudioPostgresServer, startStudioSQLiteServer } from "drizzle-kit/api";
import { schema } from "@nuxthub/db";
export default eventHandler(async (event) => {
  const query = getQuery(event);
  const port = Number(query.port) || 4983;
  const driver = query.driver || "pglite";
  if (driver === "d1") {
    const binding = event.context.cloudflare?.env?.DB || globalThis.__env__?.DB || globalThis.DB || process.env.DB;
    if (!binding) {
      throw new Error("D1 binding not found. Make sure you are running with `wrangler dev` or the D1 binding is available.");
    }
    await startStudioSQLiteServer(schema, {
      driver: "d1",
      binding
    }, { port });
  } else {
    const client = await import("@nuxthub/db").then((m) => m.client);
    await startStudioPostgresServer(schema, {
      driver: "pglite",
      client
    }, { port });
  }
  return { success: true, port };
});
