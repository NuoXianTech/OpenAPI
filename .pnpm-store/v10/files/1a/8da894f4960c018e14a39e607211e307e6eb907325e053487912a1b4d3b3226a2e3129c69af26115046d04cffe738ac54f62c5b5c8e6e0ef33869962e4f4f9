import type { Nitro } from 'nitropack';
import type { ResolvedHubConfig } from '@nuxthub/core';
/**
 * Copies database migrations and queries to the build output directory
 */
export declare function copyDatabaseAssets(nitro: Nitro, hub: ResolvedHubConfig): Promise<void>;
/**
 * Applies database migrations during build time
 */
export declare function applyBuildTimeMigrations(nitro: Nitro, hub: ResolvedHubConfig): Promise<void>;
export declare function buildDatabaseSchema(buildDir: string, { relativeDir, alias }?: {
    relativeDir?: string;
    alias?: Record<string, string>;
}): Promise<void>;
