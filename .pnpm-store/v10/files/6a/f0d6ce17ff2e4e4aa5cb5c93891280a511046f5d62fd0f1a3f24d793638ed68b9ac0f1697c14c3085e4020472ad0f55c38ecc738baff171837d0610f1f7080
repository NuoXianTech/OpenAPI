import { T as TestOptions, b as TestContext, a as TestHooks } from './shared/test-utils.BLyxqr96.mjs';
export { $ as $fetch, G as GotoOptions, N as NuxtPage, S as StartServerOptions, c as TestRunner, d as createBrowser, e as createPage, f as fetch, g as getBrowser, s as startServer, h as stopServer, u as url, w as waitForHydration } from './shared/test-utils.BLyxqr96.mjs';
import { LogType } from 'consola';
import 'playwright-core';
import '@nuxt/schema';
import 'tinyexec';
import 'ofetch';

declare function createTestContext(options: Partial<TestOptions>): TestContext;
declare function useTestContext(): TestContext;
declare function setTestContext(context: TestContext): TestContext;
declare function setTestContext(context?: TestContext): TestContext | undefined;
declare function isDev(): boolean;
declare function recoverContextFromEnv(): void;
declare function exposeContextToEnv(): void;

declare function mockFn(): ((...args: unknown[]) => unknown) | undefined;
declare function mockLogger(): Record<LogType, (...args: unknown[]) => void>;

declare function loadFixture(): Promise<void>;
declare function buildFixture(): Promise<void>;

declare function setupBun(hooks: TestHooks): Promise<void>;

declare function setupCucumber(hooks: TestHooks): Promise<void>;

declare function setupJest(hooks: TestHooks): Promise<void>;

declare function setupVitest(hooks: TestHooks): Promise<void>;

declare const setupMaps: {
    bun: typeof setupBun;
    cucumber: typeof setupCucumber;
    jest: typeof setupJest;
    vitest: typeof setupVitest;
};
declare function createTest(options: Partial<TestOptions>): TestHooks;
declare function setup(options?: Partial<TestOptions>): Promise<void>;

interface RunTestOptions {
    rootDir: string;
    dev?: boolean;
    watch?: boolean;
    runner?: 'vitest';
    globalSetup?: boolean;
}
declare function runTests(opts: RunTestOptions): Promise<void>;

export { TestContext, TestHooks, TestOptions, buildFixture, createTest, createTestContext, exposeContextToEnv, isDev, loadFixture, mockFn, mockLogger, recoverContextFromEnv, runTests, setTestContext, setup, setupMaps, useTestContext };
export type { RunTestOptions };
