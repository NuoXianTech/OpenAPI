import { ModuleOptions as ModuleOptions$1 } from '@nuxthub/core';
import { NuxtModule } from '@nuxt/schema';
import { BuiltinDriverName } from 'unstorage';
import { FSDriverOptions } from '@nuxthub/core/blob/drivers/fs';
import { S3DriverOptions } from '@nuxthub/core/blob/drivers/s3';
import { VercelDriverOptions } from '@nuxthub/core/blob/drivers/vercel-blob';
import { CloudflareDriverOptions } from '@nuxthub/core/blob/drivers/cloudflare-r2';

interface ModuleHooks {
    /**
     * Add additional schema files to scan for database schema files.
     * @param paths - Array of schema file paths to include.
     * @returns void | Promise<void>
     */
    'hub:db:schema:extend': ({ dialect, paths }: {
        dialect: string;
        paths: string[];
    }) => void | Promise<void>;
    /**
     * Add additional directories to scan for database migration files.
     * @param dirs - Array of directory paths containing .sql migration files to include.
     * @returns void | Promise<void>
     */
    'hub:db:migrations:dirs': (dirs: string[]) => void | Promise<void>;
    /**
     * Add queries that are not tracked in the `_hub_migrations` table which are applied after the database migrations complete.
     * @param queries - The path of the SQL queries paths to add.
     * @returns void | Promise<void>
     */
    'hub:db:queries:paths': (queries: string[], dialect: 'sqlite' | 'postgresql' | 'mysql') => void | Promise<void>;
}

interface HubConfig {
    blob: boolean | BlobConfig;
    cache: boolean | CacheConfig;
    db: false | 'postgresql' | 'sqlite' | 'mysql' | DatabaseConfig;
    kv: boolean | KVConfig;
    dir: string;
    hosting: string;
}
interface ResolvedHubConfig extends HubConfig {
    blob: ResolvedBlobConfig | false;
    cache: ResolvedCacheConfig | false;
    db: ResolvedDatabaseConfig | false;
    kv: ResolvedKVConfig | false;
    dir: string;
}
interface ModuleRuntimeConfig {
    hub: ResolvedHubConfig;
}
interface ModuleOptions {
    /**
     * Set `true` to enable blob storage with auto-configuration.
     * Or provide a BlobConfig object with driver and connection details.
     *
     * @default false
     * @see https://hub.nuxt.com/docs/blob
     */
    blob?: boolean | BlobConfig;
    /**
     * Set `true` to enable caching for the project with auto-configuration.
     * Or provide a CacheConfig object with driver and connection details.
     *
     * @default false
     * @see https://hub.nuxt.com/docs/cache
     */
    cache?: boolean | CacheConfig;
    /**
     * Set to `'postgresql'`, `'sqlite'`, or `'mysql'` to use a specific database dialect with a zero-config development database.
     * Or provide a DatabaseConfig object with dialect and connection details.
     *
     * @default false
     * @see https://hub.nuxt.com/docs/database
     */
    db?: 'postgresql' | 'sqlite' | 'mysql' | DatabaseConfig | false;
    /**
     * Set `true` to enable the key-value storage with auto-configuration.
     * Or provide a KVConfig object with driver and connection details.
     *
     * @default false
     * @see https://hub.nuxt.com/docs/kv
     */
    kv?: boolean | KVConfig;
    /**
     * The directory used for storage (database, kv, etc.) during local development.
     * @default '.data'
     */
    dir?: string;
    /**
     * The hosting provider that the project is hosted on.
     * This is automatically determined using the NITRO_PRESET or the detected provider during the CI/CD.
     */
    hosting?: string;
}
type FSBlobConfig = {
    driver: 'fs';
} & FSDriverOptions;
type S3BlobConfig = {
    driver: 's3';
} & S3DriverOptions;
type VercelBlobConfig = {
    driver: 'vercel-blob';
} & VercelDriverOptions;
type CloudflareR2BlobConfig = {
    driver: 'cloudflare-r2';
    bucketName?: string;
} & CloudflareDriverOptions;
type BlobConfig = boolean | FSBlobConfig | S3BlobConfig | VercelBlobConfig | CloudflareR2BlobConfig;
type ResolvedBlobConfig = FSBlobConfig | S3BlobConfig | VercelBlobConfig | CloudflareR2BlobConfig;
type CacheConfig = {
    driver?: BuiltinDriverName;
    /**
     * Cloudflare KV namespace ID for auto-generating wrangler bindings
     */
    namespaceId?: string;
    [key: string]: any;
};
type ResolvedCacheConfig = CacheConfig & {
    driver: BuiltinDriverName;
};
type KVConfig = {
    driver?: BuiltinDriverName;
    /**
     * Cloudflare KV namespace ID for auto-generating wrangler bindings
     */
    namespaceId?: string;
    [key: string]: any;
};
type ResolvedKVConfig = KVConfig & {
    driver: BuiltinDriverName;
};
type DatabaseConnection = {
    /**
     * Database connection URL
     */
    url?: string;
    /**
     * Auth token (for Turso/libSQL)
     */
    authToken?: string;
    /**
     * Connection string (for PostgreSQL)
     */
    connectionString?: string;
    /**
     * Database host
     */
    host?: string;
    /**
     * Database port
     */
    port?: number;
    /**
     * Database username
     */
    user?: string;
    /**
     * Database password
     */
    password?: string;
    /**
     * Database name
     */
    database?: string;
    /**
     * Cloudflare Account ID (for D1 HTTP driver)
     */
    accountId?: string;
    /**
     * Cloudflare API Token (for D1 HTTP driver)
     */
    apiToken?: string;
    /**
     * Cloudflare D1 Database ID (for D1 driver and D1 HTTP driver)
     */
    databaseId?: string;
    /**
     * Cloudflare Hyperdrive ID for auto-generating wrangler bindings (PostgreSQL/MySQL)
     */
    hyperdriveId?: string;
    /**
     * Additional connection options
     */
    [key: string]: any;
};
type DatabaseConfig = {
    /**
     * Database dialect
     */
    dialect: 'sqlite' | 'postgresql' | 'mysql';
    /**
     * Database driver (optional, auto-detected if not provided)
     *
     * SQLite drivers: 'better-sqlite3', 'libsql', 'bun-sqlite', 'd1', 'd1-http'
     * PostgreSQL drivers: 'postgres-js', 'pglite', 'neon-http'
     * MySQL drivers: 'mysql2'
     */
    driver?: 'better-sqlite3' | 'libsql' | 'bun-sqlite' | 'd1' | 'd1-http' | 'postgres-js' | 'pglite' | 'neon-http' | 'mysql2';
    /**
     * Database connection configuration
     */
    connection?: DatabaseConnection;
    /**
     * The directories to scan for database migrations.
     * @default ['server/db/migrations']
     */
    migrationsDirs?: string[];
    /**
     * The paths to the SQL queries to apply after the database migrations complete.
     */
    queriesPaths?: string[];
    /**
     * Set `false` to disable applying database migrations during production build time.
     *
     * @default true
     */
    applyMigrationsDuringBuild?: boolean;
    /**
     * Set `false` to disable applying database migrations during development (`nuxt dev`).
     *
     * @default true
     */
    applyMigrationsDuringDev?: boolean;
    /**
     * MySQL mode for Drizzle ORM relational queries.
     * Only applicable when dialect is 'mysql'.
     *
     * @default 'default'
     * @see https://orm.drizzle.team/docs/rqb#modes
     */
    mode?: 'default' | 'planetscale';
    /**
     * Database model naming convention for Drizzle ORM.
     * When set to `'snake_case'`, automatically maps camelCase JavaScript keys to snake_case database column names.
     *
     * @see https://orm.drizzle.team/docs/sql-schema-declaration#camel-and-snake-casing
     */
    casing?: 'snake_case' | 'camelCase';
    /**
     * Read replica connection URLs for PostgreSQL (postgres-js) and MySQL (mysql2) drivers.
     * When configured, read queries are automatically routed to replicas while writes go to the primary.
     *
     * @example
     * ```ts
     * replicas: [process.env.DATABASE_URL_REPLICA_1, process.env.DATABASE_URL_REPLICA_2].filter(Boolean)
     * ```
     *
     * @see https://orm.drizzle.team/docs/read-replicas
     */
    replicas?: string[];
};
type ResolvedDatabaseConfig = DatabaseConfig & {
    dialect: 'sqlite' | 'postgresql' | 'mysql';
    driver: 'better-sqlite3' | 'libsql' | 'bun-sqlite' | 'd1' | 'd1-http' | 'postgres-js' | 'pglite' | 'neon-http' | 'mysql2';
    connection: DatabaseConnection;
    migrationsDirs: string[];
    queriesPaths: string[];
    applyMigrationsDuringBuild: boolean;
    applyMigrationsDuringDev: boolean;
    casing?: 'snake_case' | 'camelCase';
    replicas?: string[];
};

declare const _default: NuxtModule<ModuleOptions$1>;

export { _default as default };
export type { BlobConfig, CacheConfig, CloudflareR2BlobConfig, DatabaseConfig, FSBlobConfig, HubConfig, KVConfig, ModuleHooks, ModuleOptions, ModuleRuntimeConfig, ResolvedBlobConfig, ResolvedCacheConfig, ResolvedDatabaseConfig, ResolvedHubConfig, ResolvedKVConfig, S3BlobConfig, VercelBlobConfig };
