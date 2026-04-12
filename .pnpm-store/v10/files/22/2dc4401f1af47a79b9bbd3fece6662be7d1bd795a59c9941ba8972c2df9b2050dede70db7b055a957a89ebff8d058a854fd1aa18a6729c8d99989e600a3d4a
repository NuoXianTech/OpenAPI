import * as _nuxt_schema from '@nuxt/schema';

interface ModuleOptions {
}
declare const _default: _nuxt_schema.NuxtModule<ModuleOptions, ModuleOptions, false>;

interface ModuleHooks {
    /**
     * Allows extending sources for Tailwind CSS.
     */
    'tailwindcss:sources:extend': (sources: Array<{
        type: string;
        source: string;
    }>) => void;
}
declare module '@nuxt/schema' {
    interface NuxtHooks extends ModuleHooks {
    }
}

export { _default as default };
export type { ModuleHooks, ModuleOptions };
