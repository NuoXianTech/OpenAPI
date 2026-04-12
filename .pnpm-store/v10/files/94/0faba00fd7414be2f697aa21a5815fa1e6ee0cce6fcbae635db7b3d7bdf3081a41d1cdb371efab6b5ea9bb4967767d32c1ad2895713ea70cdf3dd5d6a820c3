import type { ResolvedHubConfig } from '@nuxthub/core';
export declare function useDatabaseMigrationsStorage(hub: ResolvedHubConfig): import("unstorage").Storage<import("unstorage").StorageValue>;
export declare function getDatabaseMigrationFiles(hub: ResolvedHubConfig): Promise<{
    filename: string;
    name: string;
    dialect: string | undefined;
}[]>;
export declare function copyDatabaseMigrationsToHubDir(hub: ResolvedHubConfig): Promise<void>;
export declare function useDatabaseQueriesStorage(hub: ResolvedHubConfig): import("unstorage").Storage<import("unstorage").StorageValue>;
export declare function getDatabaseQueryFiles(hub: ResolvedHubConfig): Promise<{
    filename: string;
    name: string;
    dialect: string | undefined;
}[]>;
export declare function copyDatabaseQueriesToHubDir(hub: ResolvedHubConfig): Promise<void>;
