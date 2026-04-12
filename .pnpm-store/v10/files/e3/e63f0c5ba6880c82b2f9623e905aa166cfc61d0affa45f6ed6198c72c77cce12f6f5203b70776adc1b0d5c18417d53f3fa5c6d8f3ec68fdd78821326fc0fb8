import { Environment } from 'vitest/environments';
import { H3Event as H3Event$1 } from 'h3';
import { H3Event } from 'h3-next';
import { $Fetch } from 'nitropack';
import { EnvironmentOptions } from 'vitest/node';

declare const _default: Environment;

type NuxtBuiltinEnvironment = 'happy-dom' | 'jsdom';
interface GenericAppUse {
    (route: string, handler: (event: H3Event | H3Event$1) => unknown, options?: {
        match: (...args: [string, H3Event$1 | undefined] | [H3Event]) => boolean;
    }): void;
    (handler: (event: H3Event | H3Event$1) => unknown, options?: {
        match: (...args: [string, H3Event$1 | undefined] | [H3Event]) => boolean;
    }): void;
}
interface GenericApp {
    use: GenericAppUse;
}
interface NuxtWindow extends Window {
    __app?: GenericApp;
    __registry: Set<string>;
    __NUXT_VITEST_ENVIRONMENT__?: boolean;
    __NUXT__: Record<string, unknown>;
    $fetch: $Fetch;
    fetch: ((input: RequestInfo | URL, init?: RequestInit | undefined) => Promise<Response>);
    IntersectionObserver: unknown;
    Headers: typeof Headers;
}
interface EnvironmentNuxtOptions {
    jsdom?: EnvironmentOptions['jsdom'];
    happyDom?: EnvironmentOptions['happyDOM'];
}
type EnvironmentNuxt = (global: typeof globalThis, options: EnvironmentNuxtOptions) => Promise<{
    window: NuxtWindow;
    teardown(): void;
}>;

export { _default as default };
export type { EnvironmentNuxt, EnvironmentNuxtOptions, GenericApp, NuxtBuiltinEnvironment, NuxtWindow };
