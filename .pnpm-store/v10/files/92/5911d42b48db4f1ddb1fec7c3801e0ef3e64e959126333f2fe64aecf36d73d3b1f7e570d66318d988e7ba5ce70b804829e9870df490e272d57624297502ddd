import { cp } from "node:fs/promises";
import { join, relative, resolve } from "pathe";
import { consola } from "consola";
import { createDrizzleClient } from "./client.mjs";
import { applyDatabaseMigrations, applyDatabaseQueries } from "./migrations.mjs";
import { build } from "tsdown";
const log = consola.withTag("nuxt:hub");
export async function copyDatabaseAssets(nitro, hub) {
  if (!hub.db) return;
  const migrationsPath = join(hub.dir, "db/migrations");
  const queriesPath = join(hub.dir, "db/queries");
  const outputDir = nitro.options.output.serverDir;
  const bundledItems = [];
  try {
    await cp(migrationsPath, resolve(outputDir, "db/migrations"), { recursive: true });
    bundledItems.push("migrations");
  } catch (error) {
    if (error.code === "ENOENT") {
      log.info("No local database migrations found");
    } else {
      console.error("Error copying migrations:", error);
    }
  }
  try {
    await cp(queriesPath, resolve(outputDir, "db/queries"), { recursive: true });
    bundledItems.push("queries");
  } catch (error) {
    if (error.code === "ENOENT") {
      log.info("No local database queries found");
    } else {
      console.error("Error copying queries:", error);
    }
  }
  if (bundledItems.length > 0) {
    log.info(`Database ${bundledItems.join(" and ")} included in build`);
  }
}
export async function applyBuildTimeMigrations(nitro, hub) {
  if (!hub.db || !hub.db.applyMigrationsDuringBuild) return;
  try {
    const db = await createDrizzleClient(hub.db, hub.dir);
    const buildHubConfig = {
      ...hub,
      dir: nitro.options.output.serverDir
    };
    log.info("Applying database migrations...");
    const migrationsApplied = await applyDatabaseMigrations(buildHubConfig, db);
    if (migrationsApplied === false) {
      process.exit(1);
    }
    const queriesApplied = await applyDatabaseQueries(buildHubConfig, db);
    if (queriesApplied === false) {
      process.exit(1);
    }
    await db.$client?.end?.();
  } catch (error) {
    log.error("Failed to apply database migrations during build:", error);
    throw error;
  }
}
export async function buildDatabaseSchema(buildDir, { relativeDir, alias } = {}) {
  const startTime = Date.now();
  relativeDir = relativeDir || buildDir;
  const entry = join(buildDir, "hub/db/schema.entry.ts");
  await build({
    entry: {
      schema: entry
    },
    outDir: join(buildDir, "hub/db"),
    outExtensions: () => ({
      js: ".mjs",
      dts: ".d.mts"
    }),
    alias: {
      ...alias,
      "hub:db:schema": entry,
      "@nuxthub/db/schema": entry
    },
    platform: "neutral",
    format: "esm",
    skipNodeModulesBundle: false,
    tsconfig: false,
    dts: {
      build: false,
      tsconfig: false,
      newContext: true
    },
    clean: false,
    logLevel: "warn"
  });
  const duration = Date.now() - startTime;
  consola.debug(`Database schema built successfully at \`${relative(relativeDir, join(buildDir, "hub/db/schema.mjs"))}\` (${duration}ms)`);
}
