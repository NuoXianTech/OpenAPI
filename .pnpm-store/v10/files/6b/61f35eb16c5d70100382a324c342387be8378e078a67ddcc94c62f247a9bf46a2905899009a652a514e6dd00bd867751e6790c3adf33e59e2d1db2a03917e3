import { readFile } from "node:fs/promises";
import { createStorage } from "unstorage";
import fsDriver from "unstorage/drivers/fs";
import overlayDriver from "unstorage/drivers/overlay";
import { join } from "pathe";
import { getMigrationMetadata } from "./utils.mjs";
export function useDatabaseMigrationsStorage(hub) {
  return createStorage({
    driver: fsDriver({
      base: join(hub.dir, "db/migrations")
    })
  });
}
export async function getDatabaseMigrationFiles(hub) {
  if (!hub.db) return [];
  const dialect = hub.db.dialect;
  const storage = useDatabaseMigrationsStorage(hub);
  const migrationsFiles = (await storage.getKeys()).map((file) => getMigrationMetadata(file)).filter((migration) => migration.dialect === dialect || !migration.dialect);
  return migrationsFiles.filter((migration) => {
    if (!migration.dialect && migrationsFiles.findIndex((m) => m.name === migration.name && m.dialect === dialect) !== -1) {
      return false;
    }
    return true;
  });
}
export async function copyDatabaseMigrationsToHubDir(hub) {
  if (!hub.db) return;
  const srcStorage = createStorage({
    driver: overlayDriver({
      layers: hub.db.migrationsDirs.map((dir) => fsDriver({
        base: dir,
        ignore: [".DS_Store"]
      }))
    })
  });
  const destStorage = useDatabaseMigrationsStorage(hub);
  await destStorage.clear();
  const migrationFiles = (await srcStorage.getKeys()).filter((file) => file.endsWith(".sql"));
  await Promise.all(migrationFiles.map(async (file) => {
    const sql = await srcStorage.getItem(file);
    await destStorage.setItem(file, sql);
  }));
}
export function useDatabaseQueriesStorage(hub) {
  return createStorage({
    driver: fsDriver({
      base: join(hub.dir, "db/queries")
    })
  });
}
export async function getDatabaseQueryFiles(hub) {
  const storage = useDatabaseQueriesStorage(hub);
  const dialect = typeof hub.db === "string" ? hub.db : typeof hub.db === "object" && hub.db !== null && "dialect" in hub.db ? hub.db.dialect : void 0;
  const queriesFiles = (await storage.getKeys()).map((file) => getMigrationMetadata(file)).filter((query) => query.dialect === dialect || !query.dialect);
  return queriesFiles.filter((query) => {
    if (!query.dialect && queriesFiles.findIndex((q) => q.name === query.name && q.dialect === dialect) !== -1) {
      return false;
    }
    return true;
  });
}
export async function copyDatabaseQueriesToHubDir(hub) {
  if (!hub.db) return;
  const destStorage = useDatabaseQueriesStorage(hub);
  await destStorage.clear();
  await Promise.all(hub.db.queriesPaths.map(async (path) => {
    try {
      const filename = path.split("/").pop();
      const sql = await readFile(path, "utf-8");
      await destStorage.setItem(filename, sql);
    } catch (error) {
      console.error(`Failed to read database query file ${path}: ${error.message}`);
    }
  }));
}
