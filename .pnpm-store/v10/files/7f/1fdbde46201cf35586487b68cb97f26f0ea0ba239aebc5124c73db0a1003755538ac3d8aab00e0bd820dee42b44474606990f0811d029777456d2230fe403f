import process from 'node:process';
import { defineConfig } from 'vite';
import { setupDotenv } from 'c12';
import { createDefu, defu } from 'defu';
import { createResolver, findPath } from '@nuxt/kit';
import { resolveModulePath } from 'exsolve';
import { getPackageInfoSync } from 'local-pkg';
import { a as applyEnv, l as loadKit } from './shared/test-utils.BIY9XRkB.mjs';
import 'destr';
import 'scule';
import 'node:url';

const PLUGIN_NAME = "nuxt:vitest:nuxt-environment-options";
const STUB_ID = "nuxt-vitest-environment-options";
function NuxtVitestEnvironmentOptionsPlugin(environmentOptions = {}) {
  return {
    name: PLUGIN_NAME,
    enforce: "pre",
    resolveId(id) {
      if (id.endsWith(STUB_ID)) {
        return STUB_ID;
      }
    },
    load(id) {
      if (id.endsWith(STUB_ID)) {
        return `export default ${JSON.stringify(environmentOptions || {})}`;
      }
    }
  };
}

async function startNuxtAndGetViteConfig(rootDir = process.cwd(), options = {}) {
  const { buildNuxt, loadNuxt } = await loadKit(rootDir);
  const nuxt = await loadNuxt({
    cwd: rootDir,
    dev: false,
    dotenv: defu(options.dotenv, {
      cwd: rootDir,
      fileName: ".env.test"
    }),
    defaults: {
      // suppress compatibility date warning for runtime environment tests
      compatibilityDate: "2024-04-03"
    },
    overrides: defu(
      {
        appId: "nuxt-app",
        buildId: "test",
        ssr: false,
        test: true,
        modules: ["@nuxt/test-utils/module"]
      },
      options.overrides
    )
  });
  if (!nuxt.options._installedModules.find((i) => i?.meta?.name === "@nuxt/test-utils")) {
    throw new Error(
      "Failed to load `@nuxt/test-utils/module`. You may need to add it to your nuxt.config."
    );
  }
  const promise = new Promise((resolve, reject) => {
    nuxt.hook("vite:configResolved", (viteConfig, { isClient }) => {
      if (isClient) {
        resolve({ nuxt, viteConfig });
        throw new Error("_stop_");
      }
    });
    buildNuxt(nuxt).catch((err) => {
      if (!err.toString().includes("_stop_")) {
        reject(err);
      }
    });
  }).finally(() => nuxt.close());
  return promise;
}
const excludedPlugins = [
  "nuxt:import-protection",
  "nuxt:import-conditions",
  "nuxt:devtools:rpc",
  "nuxt:devtools:config-retriever",
  "vite-plugin-checker",
  "vite-plugin-inspect",
  "vite-plugin-vue-tracer"
];
async function getVitestConfigFromNuxt(options, loadNuxtOptions = {}) {
  const { rootDir = process.cwd(), ..._overrides } = loadNuxtOptions.overrides || {};
  if (!options) {
    options = await startNuxtAndGetViteConfig(rootDir, {
      dotenv: loadNuxtOptions.dotenv,
      overrides: {
        test: true,
        ..._overrides
      }
    });
  }
  delete options.viteConfig.root;
  options.viteConfig.plugins = (options.viteConfig.plugins || []).filter((p) => !p || !("name" in p) || !excludedPlugins.includes(p.name));
  const nuxtServerIntegration = getPackageInfoSync("@nuxt/nitro-server", {
    paths: [options.nuxt.options.appDir]
  });
  let nitroPath;
  for (const nitroCandidate of [
    ...nuxtServerIntegration?.packageJson.dependencies?.nitro ? ["nitro", "nitro-nightly"] : ["nitropack", "nitropack-nightly"]
  ]) {
    nitroPath = resolveModulePath(nitroCandidate, { from: nuxtServerIntegration?.rootPath || options.nuxt.options.appDir, try: true });
    if (nitroPath) {
      break;
    }
  }
  const h3Info = getPackageInfoSync("h3", {
    paths: nitroPath ? [nitroPath] : options.nuxt.options.modulesDir
  });
  const resolver = createResolver(import.meta.url);
  const resolvedConfig = defu(
    // overrides
    {
      define: {
        "process.env.NODE_ENV": '"test"'
      },
      resolve: {
        alias: {
          "@vue/devtools-kit": resolver.resolve("./runtime/mocks/vue-devtools"),
          "@vue/devtools-core": resolver.resolve("./runtime/mocks/vue-devtools")
        }
      },
      optimizeDeps: {
        noDiscovery: true
      },
      test: {
        environmentOptions: {
          nuxtRuntimeConfig: applyEnv(structuredClone(options.nuxt.options.runtimeConfig), {
            prefix: "NUXT_",
            env: await setupDotenv(defu(loadNuxtOptions.dotenv, {
              cwd: rootDir,
              fileName: ".env.test"
            }))
          }),
          nuxtRouteRules: defu(
            {},
            options.nuxt.options.routeRules,
            options.nuxt.options.nitro?.routeRules
          )
        },
        server: {
          deps: {
            inline: [
              // vite-node defaults
              /\/node_modules\/(.*\/)?(nuxt|nuxt3|nuxt-nightly)\//,
              /^#/,
              // additional deps
              "@nuxt/test-utils",
              "@nuxt/test-utils-nightly",
              "@nuxt/test-utils-edge",
              "vitest-environment-nuxt",
              ...options.nuxt.options.build.transpile.filter(
                (r) => typeof r === "string" || r instanceof RegExp
              )
            ]
          }
        },
        deps: {
          optimizer: {
            web: {
              enabled: false
            }
          }
        }
      }
    },
    {
      server: { middlewareMode: false },
      plugins: [
        {
          // TODO: prefix with 'nuxt:test-utils:' in next major version
          name: "disable-auto-execute",
          enforce: "pre",
          transform(code, id) {
            if (id.match(/nuxt(3|-nightly)?\/.*\/entry\./)) {
              return code.replace(
                /(?<!vueAppPromise = )entry\(\)/,
                "Promise.resolve()"
              );
            }
          }
        },
        {
          name: "nuxt:test-utils:browser-conditions",
          enforce: "pre",
          config() {
            return {
              resolve: {
                conditions: ["web", "import", "module", "default"]
              }
            };
          }
        }
      ]
    },
    // resolved vite config
    options.viteConfig,
    // (overrideable) defaults
    {
      test: {
        environmentOptions: {
          nuxt: {
            rootId: options.nuxt.options.app.rootId || void 0,
            h3Version: h3Info?.version?.startsWith("2.") ? 2 : 1,
            mock: {
              intersectionObserver: true,
              indexedDb: false
            }
          }
        }
      }
    }
  );
  delete resolvedConfig.define["process.browser"];
  delete resolvedConfig.customLogger;
  if (!Array.isArray(resolvedConfig.test.setupFiles)) {
    resolvedConfig.test.setupFiles = [resolvedConfig.test.setupFiles].filter(Boolean);
  }
  const entryPath = resolver.resolve("./runtime/entry");
  resolvedConfig.test.setupFiles.unshift(await findPath(entryPath) ?? entryPath);
  return resolvedConfig;
}
async function defineVitestProject(config) {
  const resolvedConfig = await resolveConfig(config);
  resolvedConfig.test.environment = "nuxt";
  return resolvedConfig;
}
function defineVitestConfig(config = {}) {
  return defineConfig(async () => {
    const resolvedConfig = await resolveConfig(config);
    if (resolvedConfig.test.browser?.enabled) {
      return resolvedConfig;
    }
    if ("workspace" in resolvedConfig.test || "projects" in resolvedConfig.test) {
      throw new Error(
        "The `projects` option is not supported with `defineVitestConfig`. Instead, use `defineVitestProject` to define each workspace project that uses the Nuxt environment."
      );
    }
    const defaultEnvironment = resolvedConfig.test.environment || "node";
    if (defaultEnvironment !== "nuxt") {
      const merge = createDefu((obj, key, value) => {
        if (Array.isArray(value) && Array.isArray(obj[key])) {
          obj[key] = [.../* @__PURE__ */ new Set([...value, ...obj[key]])];
          return true;
        }
      });
      const nuxtProject = merge({
        ...resolvedConfig,
        test: {
          ...resolvedConfig.test,
          name: "nuxt",
          environment: "nuxt",
          include: []
        }
      }, resolvedConfig);
      nuxtProject.test.include = [
        "**/*.nuxt.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
        "{test,tests}/nuxt/**.*"
      ];
      const defaultProject = merge({
        ...resolvedConfig,
        test: {
          ...resolvedConfig.test,
          name: defaultEnvironment,
          environment: defaultEnvironment,
          exclude: [
            "**/node_modules/**",
            "**/dist/**",
            "**/cypress/**",
            "**/.{idea,git,cache,output,temp}/**",
            "**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build,eslint,prettier}.config.*",
            "./**/*.nuxt.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
            "./{test,tests}/nuxt/**.*"
          ]
        }
      }, resolvedConfig);
      resolvedConfig.test = {
        projects: [nuxtProject, defaultProject]
      };
    }
    return resolvedConfig;
  });
}
async function resolveConfig(config) {
  const overrides = config.test?.environmentOptions?.nuxt?.overrides || {};
  overrides.rootDir = config.test?.environmentOptions?.nuxt?.rootDir;
  if (config.test?.setupFiles && !Array.isArray(config.test.setupFiles)) {
    config.test.setupFiles = [config.test.setupFiles].filter(Boolean);
  }
  const resolvedConfig = defu(
    config,
    await getVitestConfigFromNuxt(void 0, {
      dotenv: config.test?.environmentOptions?.nuxt?.dotenv,
      overrides: structuredClone(overrides)
    })
  );
  resolvedConfig.plugins.push(NuxtVitestEnvironmentOptionsPlugin(resolvedConfig.test.environmentOptions));
  if (resolvedConfig.test.browser?.enabled) {
    if (resolvedConfig.test.environment === "nuxt") {
      resolvedConfig.test.setupFiles = Array.isArray(resolvedConfig.test.setupFiles) ? resolvedConfig.test.setupFiles : [resolvedConfig.test.setupFiles].filter(Boolean);
      const resolver = createResolver(import.meta.url);
      const browserEntry = await findPath(resolver.resolve("./runtime/browser-entry")) || resolver.resolve("./runtime/browser-entry");
      resolvedConfig.test.setupFiles.unshift(browserEntry);
    }
  }
  return resolvedConfig;
}

export { defineVitestConfig, defineVitestProject, getVitestConfigFromNuxt };
