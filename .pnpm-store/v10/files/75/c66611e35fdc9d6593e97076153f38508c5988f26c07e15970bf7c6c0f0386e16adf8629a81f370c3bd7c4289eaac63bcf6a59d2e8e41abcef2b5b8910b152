import { readFile, writeFile, mkdir, copyFile, stat } from 'node:fs/promises';
import { logger, createResolver, addServerPlugin, getLayerDirectories, updateTemplates, addTemplate, addTypeTemplate, addServerHandler, addServerImports, addImportsDir, defineNuxtModule } from '@nuxt/kit';
import { join, resolve as resolve$1, relative } from 'pathe';
import { defu } from 'defu';
import { readPackageJSON, findWorkspaceDir } from 'pkg-types';
import { provider } from 'std-env';
import chokidar from 'chokidar';
import { glob } from 'tinyglobby';
import { copyDatabaseMigrationsToHubDir, copyDatabaseQueriesToHubDir, copyDatabaseAssets, applyBuildTimeMigrations, getDatabaseSchemaPathMetadata, buildDatabaseSchema } from './db/lib';
import { existsSync } from 'node:fs';
import { createHooks } from 'hookable';
import { resolve as resolve$2 } from 'node:path';
import { pathToFileURL } from 'node:url';
import { getPort } from 'get-port-please';

const version = "0.10.7";

const log$5 = logger.withTag("nuxt:hub");
function logWhenReady(nuxt, message, type = "info") {
  if (nuxt.options._prepare) {
    return;
  }
  if (nuxt.options.dev) {
    nuxt.hooks.hookOnce("modules:done", () => {
      log$5[type](message);
    });
  } else {
    log$5[type](message);
  }
}
const { resolve, resolvePath } = createResolver(import.meta.url);
function addWranglerBinding(nuxt, type, binding) {
  nuxt.options.nitro.cloudflare ||= {};
  nuxt.options.nitro.cloudflare.wrangler ||= {};
  nuxt.options.nitro.cloudflare.wrangler[type] ||= [];
  const existing = nuxt.options.nitro.cloudflare.wrangler[type];
  if (!existing.some((b) => b.binding === binding.binding)) {
    existing.push(binding);
  }
}

function resolveCacheConfig(hub) {
  if (!hub.cache) return false;
  const userConfig = typeof hub.cache === "object" ? hub.cache : {};
  if (userConfig.driver) {
    if (userConfig.driver === "cloudflare-kv-binding") {
      return defu(userConfig, { binding: "CACHE" });
    }
    return userConfig;
  }
  if (hub.hosting.includes("cloudflare")) {
    return defu(userConfig, {
      driver: "cloudflare-kv-binding",
      binding: "CACHE"
    });
  }
  if (hub.hosting.includes("vercel")) {
    return defu(userConfig, {
      driver: "vercel-runtime-cache"
    });
  }
  return defu(userConfig, {
    driver: "fs-lite",
    base: join(hub.dir, "cache")
  });
}
async function setupCache(nuxt, hub, _deps) {
  hub.cache = resolveCacheConfig(hub);
  if (!hub.cache) return;
  const cacheConfig = hub.cache;
  if (cacheConfig.driver === "cloudflare-kv-binding" && cacheConfig.namespaceId) {
    addWranglerBinding(nuxt, "kv_namespaces", { binding: cacheConfig.binding || "CACHE", id: cacheConfig.namespaceId });
  }
  const { namespaceId: _namespaceId, ...cacheStorageConfig } = cacheConfig;
  nuxt.options.nitro.storage ||= {};
  nuxt.options.nitro.storage.cache = defu(nuxt.options.nitro.storage.cache, cacheStorageConfig);
  if (nuxt.options.dev) {
    nuxt.options.nitro.devStorage ||= {};
    nuxt.options.nitro.devStorage.cache = defu(nuxt.options.nitro.devStorage.cache, cacheStorageConfig);
  }
  logWhenReady(nuxt, `\`hub:cache\` using \`${cacheConfig.driver.split("/").pop()}\` driver`);
}

const log$4 = logger.withTag("nuxt:hub");
const cloudflareHooks = createHooks();
function setupCloudflare(nuxt, hub) {
  nuxt.options.nitro.cloudflare ||= {};
  nuxt.options.nitro.cloudflare.nodeCompat = true;
  nuxt.options.nitro.cloudflare.deployConfig = true;
  nuxt.options.nitro.prerender ||= {};
  nuxt.options.nitro.prerender.autoSubfolderIndex ||= false;
  if (!hub.hosting.includes("pages")) {
    nuxt.options.nitro.cloudflare.wrangler = defu(nuxt.options.nitro.cloudflare.wrangler, {
      compatibility_flags: ["nodejs_compat"]
    });
  }
  if (nuxt.options.dev || nuxt.options._prepare) {
    return;
  }
  nuxt.hook("close", async (nuxt2) => {
    const cloudflareEnv = process.env.CLOUDFLARE_ENV;
    await processWranglerConfigFile(nuxt2, cloudflareEnv);
  });
}
const NON_INHERITABLE_KEYS = [
  "define",
  "vars",
  "durable_objects",
  "workflows",
  "cloudchamber",
  "containers",
  "kv_namespaces",
  "send_email",
  "queues",
  "r2_buckets",
  "d1_databases",
  "vectorize",
  "hyperdrive",
  "services",
  "analytics_engine_datasets",
  "browser",
  "ai",
  "images",
  "version_metadata",
  "unsafe",
  "mtls_certificates",
  "tail_consumers",
  "dispatch_namespaces",
  "pipelines",
  "secrets_store_secrets"
];
function processWranglerConfigEnv(config, targetEnv) {
  if (!config.env || Object.keys(config.env).length === 0) {
    const { env: _2, ...rest } = config;
    return rest;
  }
  const envConfig = config.env[targetEnv];
  if (!envConfig) {
    const { env: _2, ...rest } = config;
    return rest;
  }
  const { env: _, ...baseConfig } = config;
  const nonInheritableSet = new Set(NON_INHERITABLE_KEYS);
  const filteredConfig = Object.fromEntries(
    Object.entries(baseConfig).filter(([key]) => !nonInheritableSet.has(key))
  );
  return { ...filteredConfig, ...envConfig };
}
async function processWranglerConfigFile(nuxt, targetEnv) {
  const wranglerPath = join(nuxt.options.rootDir, ".output", "server", "wrangler.json");
  if (!existsSync(wranglerPath)) {
    log$4.warn(`No wrangler.json found at ${wranglerPath}, skipping wrangler processing`);
    return;
  }
  try {
    const content = await readFile(wranglerPath, "utf-8");
    let config = JSON.parse(content);
    if (targetEnv && config.env?.[targetEnv]) {
      config = processWranglerConfigEnv(config, targetEnv);
      log$4.info(`Using wrangler environment \`${targetEnv}\``);
    } else {
      if (config.env) {
        const { env: _, ...rest } = config;
        config = rest;
      }
      if (targetEnv) {
        log$4.info(`No environment \`${targetEnv}\` found in wrangler config, using top-level configuration`);
      }
    }
    await cloudflareHooks.callHook("wrangler:config", config);
    await writeFile(wranglerPath, JSON.stringify(config, null, 2), "utf-8");
  } catch (error) {
    log$4.error(`Failed to process wrangler config: ${error}`);
  }
}

const log$3 = logger.withTag("nuxt:hub");
function generateLazyDbTemplate(imports, getDbBody) {
  return `${imports}
import * as schema from './db/schema.mjs'

let _db
function getDb() {
  if (!_db) {
    try {
${getDbBody}
    } catch (e) { throw new Error('[nuxt-hub] ' + e.message) }
  }
  return _db
}
const db = new Proxy({}, { get(_, prop) { return getDb()[prop] } })
export { db, schema }
`;
}
async function resolveDatabaseConfig(nuxt, hub) {
  if (!hub.db) return false;
  let config = typeof hub.db === "string" ? { dialect: hub.db } : hub.db;
  config = defu(config, {
    migrationsDirs: getLayerDirectories(nuxt).map((layer) => join(layer.server, "db/migrations")),
    queriesPaths: [],
    applyMigrationsDuringBuild: true,
    applyMigrationsDuringDev: true
  });
  switch (config.dialect) {
    case "sqlite": {
      const userExplicitLibsql = config.driver === "libsql";
      if (process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN) {
        config.driver = "libsql";
        config.connection = defu(config.connection, {
          url: process.env.TURSO_DATABASE_URL,
          authToken: process.env.TURSO_AUTH_TOKEN
        });
        break;
      }
      if (config.driver === "d1-http") {
        config.connection = defu(config.connection, {
          accountId: process.env.NUXT_HUB_CLOUDFLARE_ACCOUNT_ID || void 0,
          apiToken: process.env.NUXT_HUB_CLOUDFLARE_API_TOKEN || void 0,
          databaseId: process.env.NUXT_HUB_CLOUDFLARE_DATABASE_ID || void 0
        });
        if (!config.connection?.accountId || !config.connection?.apiToken || !config.connection?.databaseId) {
          throw new Error("D1 HTTP driver requires NUXT_HUB_CLOUDFLARE_ACCOUNT_ID, NUXT_HUB_CLOUDFLARE_API_TOKEN, and NUXT_HUB_CLOUDFLARE_DATABASE_ID environment variables");
        }
        break;
      }
      if (config.driver === "d1") {
        break;
      }
      if (hub.hosting.includes("cloudflare") && !nuxt.options.dev) {
        config.driver = "d1";
        break;
      }
      if (userExplicitLibsql) {
        config.connection = defu(config.connection, { url: "" });
        break;
      }
      if (hub.hosting.includes("cloudflare") && !nuxt.options.dev && !nuxt.options._prepare) {
        config.driver = "d1";
        break;
      }
      config.driver ||= "libsql";
      config.connection = defu(config.connection, { url: `file:${join(hub.dir, "db/sqlite.db")}` });
      await mkdir(join(hub.dir, "db"), { recursive: true });
      break;
    }
    case "postgresql": {
      if (hub.hosting.includes("cloudflare") && config.connection?.hyperdriveId && !config.driver) {
        config.driver = "postgres-js";
        break;
      }
      config.connection = defu(config.connection, { url: process.env.POSTGRES_URL || process.env.POSTGRESQL_URL || process.env.DATABASE_URL || "" });
      if (config.applyMigrationsDuringBuild && config.driver && ["neon-http", "postgres-js"].includes(config.driver) && !config.connection.url) {
        throw new Error(`\`${config.driver}\` driver requires \`DATABASE_URL\`, \`POSTGRES_URL\`, or \`POSTGRESQL_URL\` environment variable when \`applyMigrationsDuringBuild\` is enabled`);
      }
      if (config.connection.url) {
        config.driver ||= "postgres-js";
        break;
      }
      config.driver ||= "pglite";
      config.connection = defu(config.connection, { dataDir: join(hub.dir, "db/pglite") });
      await mkdir(join(hub.dir, "db/pglite"), { recursive: true });
      break;
    }
    case "mysql": {
      if (hub.hosting.includes("cloudflare") && config.connection?.hyperdriveId && !config.driver) {
        config.driver = "mysql2";
        break;
      }
      config.driver ||= "mysql2";
      config.connection = defu(config.connection, { uri: process.env.MYSQL_URL || process.env.DATABASE_URL || "" });
      if (config.applyMigrationsDuringBuild && !config.connection.uri) {
        throw new Error("MySQL requires DATABASE_URL or MYSQL_URL environment variable when `applyMigrationsDuringBuild` is enabled");
      }
      break;
    }
  }
  if (config.driver === "d1") {
    config.applyMigrationsDuringBuild = false;
  }
  return config;
}
async function setupDatabase(nuxt, hub, deps) {
  hub.db = await resolveDatabaseConfig(nuxt, hub);
  if (!hub.db) return;
  const { dialect, driver, connection, migrationsDirs, queriesPaths } = hub.db;
  logWhenReady(nuxt, `\`hub:db\` using \`${dialect}\` database with \`${driver}\` driver`, "info");
  if (driver === "d1" && connection?.databaseId) {
    addWranglerBinding(nuxt, "d1_databases", { binding: "DB", database_id: connection.databaseId });
  }
  if (["postgres-js", "mysql2"].includes(driver) && connection?.hyperdriveId) {
    const binding = driver === "postgres-js" ? "POSTGRES" : "MYSQL";
    addWranglerBinding(nuxt, "hyperdrive", { binding, id: connection.hyperdriveId });
  }
  if (!deps["drizzle-orm"] || !deps["drizzle-kit"]) {
    logWhenReady(nuxt, "Please run `npx nypm i drizzle-orm drizzle-kit` to properly setup Drizzle ORM with NuxtHub.", "error");
  }
  if (driver === "postgres-js" && !deps["postgres"]) {
    logWhenReady(nuxt, "Please run `npx nypm i postgres` to use PostgreSQL as database.", "error");
  } else if (driver === "neon-http" && !deps["@neondatabase/serverless"]) {
    logWhenReady(nuxt, "Please run `npx nypm i @neondatabase/serverless` to use Neon serverless database.", "error");
  } else if (driver === "pglite" && !deps["@electric-sql/pglite"]) {
    logWhenReady(nuxt, "Please run `npx nypm i @electric-sql/pglite` to use PGlite as database.", "error");
  } else if (driver === "mysql2" && !deps.mysql2) {
    logWhenReady(nuxt, "Please run `npx nypm i mysql2` to use MySQL as database.", "error");
  } else if (driver === "libsql" && !deps["@libsql/client"]) {
    logWhenReady(nuxt, "Please run `npx nypm i @libsql/client` to use SQLite as database.", "error");
  }
  addServerPlugin(resolve("db/runtime/plugins/migrations.dev"));
  nuxt.hook("modules:done", async () => {
    await generateDatabaseSchema(nuxt, hub);
    await nuxt.callHook("hub:db:migrations:dirs", migrationsDirs);
    await copyDatabaseMigrationsToHubDir(hub);
    await nuxt.callHook("hub:db:queries:paths", queriesPaths, dialect);
    await copyDatabaseQueriesToHubDir(hub);
  });
  nuxt.hook("nitro:build:public-assets", async (nitro) => {
    await copyDatabaseAssets(nitro, hub);
    await applyBuildTimeMigrations(nitro, hub);
  });
  if (driver === "d1") {
    cloudflareHooks.hook("wrangler:config", (config) => {
      const d1Databases = config.d1_databases;
      if (!d1Databases?.length) return;
      const dbBinding = d1Databases.find((db) => db.binding === "DB");
      if (dbBinding) {
        dbBinding.migrations_table ||= "_hub_migrations";
        dbBinding.migrations_dir ||= "db/migrations/sqlite/";
      }
    });
  }
  await setupDatabaseClient(nuxt, hub);
  await setupDatabaseConfig(nuxt, hub);
}
async function generateDatabaseSchema(nuxt, hub) {
  if (!hub.db) return;
  const dialect = hub.db.dialect;
  const getSchemaPaths = async () => {
    const schemaPatterns = getLayerDirectories(nuxt).map((layer) => [
      resolve$1(layer.server, "db/schema.ts"),
      resolve$1(layer.server, `db/schema.${dialect}.ts`),
      resolve$1(layer.server, "db/schema/*.ts")
    ]).flat();
    let schemaPaths2 = await glob(schemaPatterns, { absolute: true, onlyFiles: true });
    await nuxt.callHook("hub:db:schema:extend", { dialect, paths: schemaPaths2 });
    schemaPaths2 = schemaPaths2.filter((path) => {
      const meta = getDatabaseSchemaPathMetadata(path);
      return !meta.dialect || meta.dialect === dialect;
    });
    return schemaPaths2;
  };
  let schemaPaths = await getSchemaPaths();
  if (nuxt.options.dev && !nuxt.options._prepare) {
    const watchDirs = getLayerDirectories(nuxt).map((layer) => resolve$1(layer.server, "db"));
    const watcher = chokidar.watch(watchDirs, {
      ignoreInitial: true
    });
    watcher.on("all", async (event, path) => {
      if (!path.endsWith("db/schema.ts") && !path.endsWith(`db/schema.${dialect}.ts`) && !path.includes("/db/schema/")) return;
      if (["add", "unlink", "change"].includes(event) === false) return;
      const meta = getDatabaseSchemaPathMetadata(path);
      if (meta.dialect && meta.dialect !== dialect) return;
      log$3.info(`Database schema ${event === "add" ? "added" : event === "unlink" ? "removed" : "changed"}: \`${relative(nuxt.options.rootDir, path)}\``);
      log$3.info("Make sure to run `npx nuxt db generate` to generate the database migrations.");
      schemaPaths = await getSchemaPaths();
      await updateTemplates({ filter: (template) => template.filename.includes("hub/db/schema.entry.ts") });
      await buildDatabaseSchema(nuxt.options.buildDir, { relativeDir: nuxt.options.rootDir, alias: nuxt.options.alias });
      const physicalDbDir = join(nuxt.options.rootDir, "node_modules", "@nuxthub", "db");
      try {
        await copyFile(join(nuxt.options.buildDir, "hub/db/schema.mjs"), join(physicalDbDir, "schema.mjs"));
        await copyFile(join(nuxt.options.buildDir, "hub/db/schema.d.mts"), join(physicalDbDir, "schema.d.mts"));
      } catch (error) {
      }
    });
    nuxt.hook("close", () => watcher.close());
  }
  addTemplate({
    filename: "hub/db/schema.entry.ts",
    getContents: () => `${schemaPaths.map((path) => `export * from '${path}'`).join("\n")}`,
    write: true
  });
  nuxt.hooks.hookOnce("app:templatesGenerated", async () => {
    await buildDatabaseSchema(nuxt.options.buildDir, { relativeDir: nuxt.options.rootDir, alias: nuxt.options.alias });
    const physicalDbDir = join(nuxt.options.rootDir, "node_modules", "@nuxthub", "db");
    await mkdir(physicalDbDir, { recursive: true });
    try {
      await copyFile(join(nuxt.options.buildDir, "hub/db/schema.mjs"), join(physicalDbDir, "schema.mjs"));
      const buildDirSource = join(nuxt.options.buildDir, "hub/db/schema.d.mts");
      const nuxtDirSource = join(nuxt.options.rootDir, ".nuxt/hub/db/schema.d.mts");
      let schemaTypes;
      try {
        schemaTypes = await readFile(buildDirSource, "utf-8");
      } catch {
        try {
          schemaTypes = await readFile(nuxtDirSource, "utf-8");
        } catch {
        }
      }
      if (schemaTypes && schemaTypes.length > 50) {
        await writeFile(join(physicalDbDir, "schema.d.mts"), schemaTypes);
      } else if (!nuxt.options.test) {
        await writeFile(join(physicalDbDir, "schema.d.mts"), `export * from './schema.mjs'`);
      }
    } catch (error) {
      log$3.warn(`Failed to copy schema to node_modules/.hub/: ${error}`);
    }
  });
  nuxt.options.alias ||= {};
  addTypeTemplate({
    filename: "hub/db/schema.d.ts",
    getContents: () => `declare module 'hub:db:schema' {
  export * from '#build/hub/db/schema.mjs'
}`
  }, { nitro: true, nuxt: true });
  nuxt.options.alias["hub:db:schema"] = "@nuxthub/db/schema";
}
async function setupDatabaseClient(nuxt, hub) {
  const { dialect, driver, connection, mode, casing, replicas } = hub.db;
  const postgresOpts = (() => {
    if (driver !== "postgres-js" || !connection) return "{ onnotice: () => {} }";
    const { url: _, ...rest } = connection;
    return Object.keys(rest).length ? `{ onnotice: () => {}, ...${JSON.stringify(rest)} }` : "{ onnotice: () => {} }";
  })();
  const driverForTypes = driver === "d1-http" ? "sqlite-proxy" : driver;
  const databaseTypes = `declare module 'hub:db' {
  export * from '@nuxthub/db'
}`;
  addTypeTemplate({
    filename: "hub/db.d.ts",
    getContents: () => databaseTypes
  }, { nitro: true, nuxt: true });
  const modeOption = dialect === "mysql" ? `, mode: '${mode || "default"}'` : "";
  const casingOption = casing ? `, casing: '${casing}'` : "";
  let drizzleOrmContent = `import { drizzle } from 'drizzle-orm/${driver}'
import * as schema from './db/schema.mjs'

const db = drizzle({ connection: ${JSON.stringify(connection)}, schema${modeOption}${casingOption} })
export { db, schema }
`;
  if (driver === "pglite" && nuxt.options.dev) {
    drizzleOrmContent = `import { drizzle } from 'drizzle-orm/pglite'
import { PGlite } from '@electric-sql/pglite'
import * as schema from './db/schema.mjs'

const client = new PGlite(${JSON.stringify(connection.dataDir)})
const db = drizzle({ client, schema${casingOption} })
export { db, schema, client }
`;
    addServerHandler({
      handler: await resolvePath("db/runtime/api/launch-studio.post.dev"),
      method: "post",
      route: "/api/_hub/db/launch-studio"
    });
  }
  if (driver === "d1" && nuxt.options.dev) {
    addServerHandler({
      handler: await resolvePath("db/runtime/api/launch-studio.post.dev"),
      method: "post",
      route: "/api/_hub/db/launch-studio"
    });
  }
  if (driver === "postgres-js" && nuxt.options.dev) {
    const replicaUrls = (replicas || []).filter(Boolean);
    const hasReplicas = replicaUrls.length > 0;
    if (hasReplicas) {
      drizzleOrmContent = `import { drizzle } from 'drizzle-orm/postgres-js'
import { withReplicas } from 'drizzle-orm/pg-core'
import postgres from 'postgres'
import * as schema from './db/schema.mjs'

const client = postgres('${connection.url}', ${postgresOpts})
const primary = drizzle({ client, schema${casingOption} })

const replicaUrls = ${JSON.stringify(replicaUrls)}
const replicaConnections = replicaUrls.map(replicaUrl => {
  const replicaClient = postgres(replicaUrl, ${postgresOpts})
  return drizzle({ client: replicaClient, schema${casingOption} })
})
const db = withReplicas(primary, replicaConnections)
export { db, schema }
`;
    } else {
      drizzleOrmContent = `import { drizzle } from 'drizzle-orm/postgres-js'
import * as schema from './db/schema.mjs'

const db = drizzle({ connection: { ...${JSON.stringify(connection)}, onnotice: () => {} }, schema${casingOption} })
export { db, schema }
`;
    }
  }
  if (driver === "mysql2" && nuxt.options.dev) {
    const replicaUrls = (replicas || []).filter(Boolean);
    const hasReplicas = replicaUrls.length > 0;
    if (hasReplicas) {
      drizzleOrmContent = `import { drizzle } from 'drizzle-orm/mysql2'
import { withReplicas } from 'drizzle-orm/mysql-core'
import * as schema from './db/schema.mjs'

const primary = drizzle({ connection: ${JSON.stringify(connection)}, schema${modeOption}${casingOption} })

const replicaUrls = ${JSON.stringify(replicaUrls)}
const replicaConnections = replicaUrls.map(replicaUrl => {
  return drizzle({ connection: { uri: replicaUrl }, schema${modeOption}${casingOption} })
})
const db = withReplicas(primary, replicaConnections)
export { db, schema }
`;
    }
  }
  if (driver === "neon-http") {
    const urlExpr = connection.url ? `'${connection.url}'` : `process.env.POSTGRES_URL || process.env.POSTGRESQL_URL || process.env.DATABASE_URL`;
    drizzleOrmContent = generateLazyDbTemplate(
      `import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'`,
      `    const url = ${urlExpr}
    if (!url) throw new Error('DATABASE_URL, POSTGRES_URL, or POSTGRESQL_URL required')
    const sql = neon(url)
    _db = drizzle(sql, { schema${casingOption} })`
    );
  }
  if (driver === "d1") {
    drizzleOrmContent = generateLazyDbTemplate(
      `import { drizzle } from 'drizzle-orm/d1'`,
      `    const binding = process.env.DB || globalThis.__env__?.DB || globalThis.DB
    if (!binding) throw new Error('DB binding not found')
    _db = drizzle(binding, { schema${casingOption} })`
    );
  }
  if (driver === "d1-http") {
    drizzleOrmContent = `import { drizzle } from 'drizzle-orm/sqlite-proxy'
import * as schema from './db/schema.mjs'

const accountId = ${JSON.stringify(connection.accountId)}
const databaseId = ${JSON.stringify(connection.databaseId)}
const apiToken = ${JSON.stringify(connection.apiToken)}

async function d1HttpDriver(sql, params, method) {
  if (method === 'values') method = 'all'

  const { errors, success, result } = await $fetch(\`https://api.cloudflare.com/client/v4/accounts/\${accountId}/d1/database/\${databaseId}/raw\`, {
    method: 'POST',
    headers: {
      Authorization: \`Bearer \${apiToken}\`,
      'Content-Type': 'application/json'
    },
    async onResponseError({ request, response, options }) {
      console.error(
        "D1 HTTP Error:",
        request,
        options.body,
        response.status,
        response._data,
      )
    },
    body: { sql, params }
  })

  if (errors?.length > 0 || !success) {
    throw new Error(\`D1 HTTP error: \${JSON.stringify({ errors, success, result })}\`)
  }

  const queryResult = result?.[0]
  if (!queryResult?.success) {
    throw new Error(\`D1 HTTP error: \${JSON.stringify({ errors, success, result })}\`)
  }

  const rows = queryResult.results?.rows || []

  if (method === 'get') {
    if (rows.length === 0) {
      return { rows: [] }
    }
    return { rows: rows[0] }
  }

  return { rows }
}

const db = drizzle(d1HttpDriver, { schema${casingOption} })

export { db, schema }
`;
  }
  if (["postgres-js", "mysql2"].includes(driver) && hub.hosting.includes("cloudflare") && connection?.hyperdriveId) {
    const bindingName = driver === "postgres-js" ? "POSTGRES" : "MYSQL";
    drizzleOrmContent = generateLazyDbTemplate(
      `import { drizzle } from 'drizzle-orm/${driver}'`,
      `    const hyperdrive = process.env.${bindingName} || globalThis.__env__?.${bindingName} || globalThis.${bindingName}
    if (!hyperdrive) throw new Error('${bindingName} binding not found')
    _db = drizzle({ connection: hyperdrive.connectionString, schema${modeOption}${casingOption} })`
    );
  }
  if (driver === "postgres-js" && !nuxt.options.dev && !hub.hosting.includes("cloudflare")) {
    const urlExpr = connection.url ? `'${connection.url}'` : `process.env.POSTGRES_URL || process.env.POSTGRESQL_URL || process.env.DATABASE_URL`;
    const replicaUrls = (replicas || []).filter(Boolean);
    const hasReplicas = replicaUrls.length > 0;
    drizzleOrmContent = generateLazyDbTemplate(
      `import { drizzle } from 'drizzle-orm/postgres-js'
${hasReplicas ? `import { withReplicas } from 'drizzle-orm/pg-core'
` : ""}import postgres from 'postgres'`,
      `    const url = ${urlExpr}
    if (!url) throw new Error('DATABASE_URL, POSTGRES_URL, or POSTGRESQL_URL required')
    const client = postgres(url, ${postgresOpts})
${hasReplicas ? `    const primary = drizzle({ client, schema${casingOption} })

    const replicaUrls = ${JSON.stringify(replicaUrls)}
    const replicaConnections = replicaUrls.map(replicaUrl => {
      const replicaClient = postgres(replicaUrl, ${postgresOpts})
      return drizzle({ client: replicaClient, schema${casingOption} })
    })
    _db = withReplicas(primary, replicaConnections)` : `    _db = drizzle({ client, schema${casingOption} })`}`
    );
  }
  if (driver === "mysql2" && !nuxt.options.dev && !hub.hosting.includes("cloudflare")) {
    const uriExpr = connection.uri ? `'${connection.uri}'` : `process.env.MYSQL_URL || process.env.DATABASE_URL`;
    const replicaUrls = (replicas || []).filter(Boolean);
    const hasReplicas = replicaUrls.length > 0;
    drizzleOrmContent = generateLazyDbTemplate(
      `import { drizzle } from 'drizzle-orm/mysql2'${hasReplicas ? `
import { withReplicas } from 'drizzle-orm/mysql-core'` : ""}`,
      `    const uri = ${uriExpr}
    if (!uri) throw new Error('DATABASE_URL or MYSQL_URL required')
${hasReplicas ? `    const primary = drizzle({ connection: { uri }, schema${modeOption}${casingOption} })

    const replicaUrls = ${JSON.stringify(replicaUrls)}
    const replicaConnections = replicaUrls.map(replicaUrl => {
      return drizzle({ connection: { uri: replicaUrl }, schema${modeOption}${casingOption} })
    })
    _db = withReplicas(primary, replicaConnections)` : `    _db = drizzle({ connection: { uri }, schema${modeOption}${casingOption} })`}`
    );
  }
  if (driver === "libsql" && !connection.url) {
    drizzleOrmContent = generateLazyDbTemplate(
      `import { drizzle } from 'drizzle-orm/libsql'`,
      `    const url = process.env.TURSO_DATABASE_URL || process.env.LIBSQL_URL || process.env.DATABASE_URL
    const authToken = process.env.TURSO_AUTH_TOKEN || process.env.LIBSQL_AUTH_TOKEN
    if (!url) throw new Error('Database URL not found. Set TURSO_DATABASE_URL, LIBSQL_URL, or DATABASE_URL')
    _db = drizzle({ connection: { url, authToken }, schema${casingOption} })`
    );
  }
  const physicalDbDir = join(nuxt.options.rootDir, "node_modules", "@nuxthub", "db");
  await mkdir(physicalDbDir, { recursive: true });
  await writeFile(
    join(physicalDbDir, "db.mjs"),
    drizzleOrmContent.replace(/from '\.\/db\/schema\.mjs'/g, "from './schema.mjs'")
  );
  const physicalDbTypes = `import type { DrizzleConfig } from 'drizzle-orm'
import { drizzle as drizzleCore } from 'drizzle-orm/${driverForTypes}'
import * as schema from './schema.mjs'

/**
 * The database schema object
 * Defined in server/db/schema.ts and server/db/schema/*.ts
 */
export { schema }
/**
 * The ${driver} database client.
 */
export const db: ReturnType<typeof drizzleCore<typeof schema>>
`;
  await writeFile(
    join(physicalDbDir, "db.d.ts"),
    physicalDbTypes
  );
  const packageJson = {
    name: "@nuxthub/db",
    version: "0.0.0",
    type: "module",
    exports: {
      ".": { types: "./db.d.ts", default: "./db.mjs" },
      "./schema": { types: "./schema.d.mts", default: "./schema.mjs" }
    }
  };
  try {
    await writeFile(join(physicalDbDir, "package.json"), JSON.stringify(packageJson, null, 2));
    const schemaPath = join(physicalDbDir, "schema.mjs");
    const schemaDtsPath = join(physicalDbDir, "schema.d.mts");
    const schemaExists = await stat(schemaPath).then((s) => s.size > 20).catch(() => false);
    const schemaDtsExists = await stat(schemaDtsPath).then((s) => s.size > 20).catch(() => false);
    if (!schemaExists) await writeFile(schemaPath, "export {}");
    if (!schemaDtsExists) await writeFile(schemaDtsPath, "export {}");
  } catch (error) {
    throw new Error(`Failed to create @nuxthub/db package files: ${error.message}`);
  }
  nuxt.options.alias["hub:db"] = "@nuxthub/db";
  addServerImports({ name: "db", from: "@nuxthub/db", meta: { description: `The ${driver} database client.` } });
  addServerImports({ name: "schema", from: "@nuxthub/db", meta: { description: `The database schema object` } });
}
async function setupDatabaseConfig(nuxt, hub) {
  const { dialect, casing } = hub.db;
  const casingConfig = casing ? `
  casing: '${casing}',` : "";
  addTemplate({
    filename: "hub/db/drizzle.config.ts",
    write: true,
    getContents: () => `import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: '${dialect}',${casingConfig}
  schema: '${relative(nuxt.options.rootDir, resolve(nuxt.options.buildDir, "hub/db/schema.mjs"))}',
  out: '${relative(nuxt.options.rootDir, resolve(nuxt.options.rootDir, `server/db/migrations/${dialect}`))}'
});`
  });
}

function resolveKVConfig(hub) {
  if (!hub.kv) return false;
  if (typeof hub.kv === "object" && "driver" in hub.kv) {
    if (hub.kv.driver === "cloudflare-kv-binding") {
      return defu(hub.kv, { binding: "KV" });
    }
    return hub.kv;
  }
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    return defu(hub.kv, {
      driver: "upstash",
      url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN
    });
  }
  if (process.env.REDIS_URL || process.env.KV_URL?.startsWith("rediss://")) {
    return defu(hub.kv, {
      driver: "redis",
      url: process.env.REDIS_URL || process.env.KV_URL
    });
  }
  if (process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY && process.env.S3_BUCKET && process.env.S3_REGION) {
    return defu(hub.kv, {
      driver: "s3",
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
      bucket: process.env.S3_BUCKET,
      region: process.env.S3_REGION,
      endpoint: process.env.S3_ENDPOINT || void 0
    });
  }
  if (hub.hosting.includes("cloudflare")) {
    return defu(hub.kv, {
      driver: "cloudflare-kv-binding",
      binding: "KV"
    });
  }
  if (hub.hosting.includes("deno")) {
    return defu(hub.kv, {
      driver: "deno-kv"
    });
  }
  return defu(hub.kv, {
    driver: "fs-lite",
    base: ".data/kv"
  });
}
async function setupKV(nuxt, hub, deps) {
  hub.kv = resolveKVConfig(hub);
  if (!hub.kv) return;
  const kvConfig = hub.kv;
  if (kvConfig.driver === "cloudflare-kv-binding" && kvConfig.namespaceId) {
    addWranglerBinding(nuxt, "kv_namespaces", { binding: kvConfig.binding || "KV", id: kvConfig.namespaceId });
  }
  if (kvConfig.driver === "upstash" && !deps["@upstash/redis"]) {
    logWhenReady(nuxt, "Please run `npx nypm i @upstash/redis` to use Upstash Redis KV storage", "error");
  }
  if (kvConfig.driver === "redis" && !deps["ioredis"]) {
    logWhenReady(nuxt, "Please run `npx nypm i ioredis` to use Redis KV storage", "error");
  }
  if (hub.hosting.includes("vercel") && kvConfig.driver === "fs-lite") {
    logWhenReady(nuxt, "Vercel hosting requires a Redis connection. Please set the `REDIS_URL` environment variable. See https://vercel.com/marketplace/category/database", "error");
  }
  const { namespaceId: _namespaceId, ...kvStorageConfig } = kvConfig;
  nuxt.options.nitro.storage ||= {};
  nuxt.options.nitro.storage.kv = defu(nuxt.options.nitro.storage.kv, kvStorageConfig);
  const { driver, ...driverOptions } = kvStorageConfig;
  const kvContent = `import { createStorage } from "unstorage"
import driver from "unstorage/drivers/${driver}";

export const kv = createStorage({
  driver: driver(${JSON.stringify(driverOptions)}),
});
`;
  const physicalKvDir = join(nuxt.options.rootDir, "node_modules", "@nuxthub", "kv");
  await mkdir(physicalKvDir, { recursive: true });
  await writeFile(
    join(physicalKvDir, "kv.mjs"),
    kvContent
  );
  await copyFile(
    resolve("kv/runtime/kv.d.ts"),
    join(physicalKvDir, "kv.d.ts")
  );
  const packageJson = {
    name: "@nuxthub/kv",
    version: "0.0.0",
    type: "module",
    exports: {
      ".": {
        types: "./kv.d.ts",
        default: "./kv.mjs"
      }
    }
  };
  await writeFile(
    join(physicalKvDir, "package.json"),
    JSON.stringify(packageJson, null, 2)
  );
  nuxt.options.alias["hub:kv"] = "@nuxthub/kv";
  addServerImports({ name: "kv", from: "@nuxthub/kv", meta: { description: `The Key-Value storage instance.` } });
  addTypeTemplate({
    filename: "hub/kv.d.ts",
    getContents: () => `declare module 'hub:kv' {
  export * from '@nuxthub/kv'
}`
  }, { nitro: true, nuxt: true });
  logWhenReady(nuxt, `\`hub:kv\` using \`${driver}\` driver`);
}

const log$2 = logger.withTag("nuxt:hub");
const supportedDrivers = ["fs", "s3", "vercel-blob", "cloudflare-r2"];
function resolveBlobConfig(hub, deps) {
  if (!hub.blob) return false;
  if (typeof hub.blob === "object" && "driver" in hub.blob) {
    return hub.blob;
  }
  if (process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY && (process.env.S3_BUCKET || process.env.S3_ENDPOINT)) {
    if (!deps["aws4fetch"]) {
      log$2.error("Please run `npx nypm i aws4fetch` to use S3");
    }
    return defu(hub.blob, {
      driver: "s3",
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
      bucket: process.env.S3_BUCKET || "",
      region: process.env.S3_REGION || "auto",
      endpoint: process.env.S3_ENDPOINT
    });
  }
  if (hub.hosting.includes("vercel") || process.env.BLOB_READ_WRITE_TOKEN) {
    if (!deps["@vercel/blob"]) {
      log$2.error("Please run `npx nypm i @vercel/blob` to use Vercel Blob");
    }
    return defu(hub.blob, {
      driver: "vercel-blob",
      access: "public"
    });
  }
  if (hub.hosting.includes("cloudflare")) {
    return defu(hub.blob, {
      driver: "cloudflare-r2",
      binding: "BLOB"
    });
  }
  return defu(hub.blob, {
    driver: "fs",
    dir: join(hub.dir, "blob")
  });
}
async function setupBlob(nuxt, hub, deps) {
  hub.blob = resolveBlobConfig(hub, deps);
  if (!hub.blob) return;
  const blobConfig = hub.blob;
  if (blobConfig.driver === "cloudflare-r2" && blobConfig.bucketName) {
    addWranglerBinding(nuxt, "r2_buckets", { binding: blobConfig.binding || "BLOB", bucket_name: blobConfig.bucketName });
  }
  addImportsDir(resolve("blob/runtime/app/composables"));
  const { driver, bucketName: _bucketName, ...driverOptions } = blobConfig;
  if (!supportedDrivers.includes(driver)) {
    log$2.error(`Unsupported blob driver: ${driver}. Supported drivers: ${supportedDrivers.join(", ")}`);
    return;
  }
  const blobContent = `import { createBlobStorage } from "@nuxthub/core/blob";
import { createDriver } from "@nuxthub/core/blob/drivers/${driver}";

export { ensureBlob } from "@nuxthub/core/blob";
export const blob = createBlobStorage(createDriver(${JSON.stringify(driverOptions)}));
`;
  const physicalBlobDir = join(nuxt.options.rootDir, "node_modules", "@nuxthub", "blob");
  await mkdir(physicalBlobDir, { recursive: true });
  await writeFile(join(physicalBlobDir, "blob.mjs"), blobContent);
  await copyFile(
    resolve("blob/runtime/blob.d.ts"),
    join(physicalBlobDir, "blob.d.ts")
  );
  const packageJson = {
    name: "@nuxthub/blob",
    version: "0.0.0",
    type: "module",
    exports: {
      ".": {
        types: "./blob.d.ts",
        default: "./blob.mjs"
      }
    }
  };
  await writeFile(join(physicalBlobDir, "package.json"), JSON.stringify(packageJson, null, 2));
  nuxt.options.alias["hub:blob"] = "@nuxthub/blob";
  addServerImports({ name: "blob", from: "@nuxthub/blob", meta: { description: `The Blob storage instance.` } });
  addServerImports({ name: "ensureBlob", from: "@nuxthub/blob", meta: { description: `Ensure the blob is valid and meets the specified requirements.` } });
  addTypeTemplate({
    filename: "hub/blob.d.ts",
    getContents: () => `declare module 'hub:blob' {
  export * from '@nuxthub/blob'
}`
  }, { nitro: true, nuxt: true });
  if (blobConfig.driver === "vercel-blob") {
    nuxt.options.runtimeConfig.public.hub ||= {};
    nuxt.options.runtimeConfig.public.hub.blobProvider = "vercel-blob";
    logWhenReady(nuxt, "Files stored in Vercel Blob are public. Manually configure a different storage driver if storing sensitive files.", "warn");
  }
  logWhenReady(nuxt, `\`hub:blob\` using \`${blobConfig.driver}\` driver`);
}

let isReady = false;
let promise = null;
let port = 4983;
const log$1 = logger.withTag("nuxt:hub");
async function launchDrizzleStudio(nuxt, hub) {
  const dbConfig = hub.db;
  if (!dbConfig || typeof dbConfig === "boolean" || typeof dbConfig === "string") {
    throw new Error("Database configuration not resolved properly. Please ensure database is configured in hub.db");
  }
  port = await getPort({ port: 4983 });
  try {
    const { dialect, driver, connection } = dbConfig;
    const dbEntry = resolve$2(nuxt.options.rootDir, "node_modules", "@nuxthub", "db", "db.mjs");
    if (!existsSync(dbEntry)) {
      throw new Error(`Cannot find @nuxthub/db at ${dbEntry}. Run \`nuxi prepare\` to generate it.`);
    }
    const { schema } = await import(pathToFileURL(dbEntry).href);
    const nitroDevUrl = `${nuxt.options.devServer.https ? "https" : "http"}://localhost:${nuxt.options.devServer.port || 3e3}`;
    if (dialect === "postgresql") {
      if (driver === "pglite") {
        log$1.info(`Launching Drizzle Studio with PGlite...`);
        await fetch(`${nitroDevUrl}/api/_hub/db/launch-studio?port=${port}&driver=pglite`, {
          method: "POST"
        });
      } else {
        const { startStudioPostgresServer } = await import('drizzle-kit/api');
        log$1.info(`Launching Drizzle Studio with PostgreSQL...`);
        await startStudioPostgresServer(schema, connection, { port });
      }
    } else if (dialect === "mysql") {
      const { startStudioMySQLServer } = await import('drizzle-kit/api');
      log$1.info(`Launching Drizzle Studio with MySQL...`);
      await startStudioMySQLServer(schema, connection, { port });
    } else if (dialect === "sqlite") {
      if (driver === "d1") {
        log$1.info(`Launching Drizzle Studio with D1 binding...`);
        await fetch(`${nitroDevUrl}/api/_hub/db/launch-studio?port=${port}&driver=d1`, {
          method: "POST"
        });
      } else {
        const { startStudioSQLiteServer } = await import('drizzle-kit/api');
        log$1.info(`Launching Drizzle Studio with SQLite (${driver})...`);
        const studioConnection = driver === "d1-http" ? { driver: "d1-http", ...connection } : connection;
        await startStudioSQLiteServer(schema, studioConnection, { port });
      }
    } else {
      throw new Error(`Unsupported database dialect: ${dialect}`);
    }
    isReady = true;
  } catch (error) {
    log$1.error("Failed to launch Drizzle Studio:", error);
    throw error;
  }
}
function addDevToolsCustomTabs(nuxt, hub) {
  nuxt.hook("devtools:customTabs", (tabs) => {
    if (nuxt.options.nitro.experimental?.openAPI) ;
    if (hub.db) tabs.push({
      category: "server",
      name: "hub-db",
      title: "Database",
      icon: "i-lucide-database",
      view: isReady && port ? {
        type: "iframe",
        src: `https://local.drizzle.studio?port=${port}`,
        permissions: ["local-network-access https://local.drizzle.studio"]
      } : {
        type: "launch",
        description: "Launch Drizzle Studio",
        actions: [{
          label: promise ? "Starting..." : "Launch",
          pending: isReady,
          handle() {
            promise = promise || launchDrizzleStudio(nuxt, hub);
            return promise;
          }
        }]
      }
    });
  });
}

const log = logger.withTag("nuxt:hub");
const module$1 = defineNuxtModule({
  meta: {
    name: "@nuxthub/core",
    configKey: "hub",
    version,
    docs: "https://hub.nuxt.com"
  },
  defaults: {},
  async setup(options, nuxt) {
    if (nuxt.options.nitro.static || nuxt.options._generate) {
      log.error("NuxtHub is not compatible with `nuxt generate` as it needs a server to run.");
      log.info("To pre-render all pages: `https://hub.nuxt.com/docs/recipes/pre-rendering#pre-render-all-pages`");
      return process.exit(1);
    }
    const rootDir = nuxt.options.rootDir;
    const hosting = process.env.NITRO_PRESET || nuxt.options.nitro.preset || provider;
    const hub = defu(options, {
      // Local storage
      dir: ".data",
      hosting,
      // NuxtHub features
      blob: false,
      cache: false,
      db: false,
      kv: false
    });
    hub.dir = await resolve$1(nuxt.options.rootDir, hub.dir);
    await mkdir(hub.dir, { recursive: true }).catch((e) => {
      if (e.errno !== -17) throw e;
    });
    const packageJSON = await readPackageJSON(nuxt.options.rootDir);
    const deps = Object.assign({}, packageJSON.dependencies, packageJSON.devDependencies);
    await setupBlob(nuxt, hub, deps);
    await setupCache(nuxt, hub);
    await setupDatabase(nuxt, hub, deps);
    await setupKV(nuxt, hub, deps);
    const runtimeConfig = nuxt.options.runtimeConfig;
    runtimeConfig.hub = hub;
    runtimeConfig.public.hub ||= {};
    if (nuxt.options._prepare) {
      addTemplate({
        filename: "hub/db/config.json",
        write: true,
        getContents: () => JSON.stringify(hub, null, 2)
      });
    }
    if (nuxt.options._prepare) {
      return;
    }
    if (nuxt.options.dev) {
      addDevToolsCustomTabs(nuxt, hub);
    }
    nuxt.options.nitro.experimental = nuxt.options.nitro.experimental || {};
    nuxt.options.nitro.experimental.asyncContext = true;
    if (!nuxt.options.dev && hub.hosting.includes("cloudflare")) {
      setupCloudflare(nuxt, hub);
    }
    if (nuxt.options.dev) {
      const workspaceDir = await findWorkspaceDir(rootDir);
      const gitignorePath = join(workspaceDir, ".gitignore");
      const gitignore = await readFile(gitignorePath, "utf-8").catch(() => "");
      const relativeDir = relative(workspaceDir, hub.dir);
      if (!gitignore.includes(relativeDir)) {
        await writeFile(gitignorePath, `${gitignore ? gitignore + "\n" : gitignore}${relativeDir}`, "utf-8");
      }
    }
  }
});

export { module$1 as default };
