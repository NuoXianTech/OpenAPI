import { createFetch } from "ofetch";
import { joinURL } from "ufo";
import { defineEventHandler } from "./h3.mjs";
import { createRouter as createRadixRouter, exportMatcher, toRouteMatcher } from "radix3";
import { createFetchForH3V1 } from "./h3-v1.mjs";
import { createFetchForH3V2 } from "./h3-v2.mjs";
export async function setupWindow(win, environmentOptions) {
  win.__NUXT_VITEST_ENVIRONMENT__ = true;
  win.__NUXT__ = {
    serverRendered: false,
    config: {
      public: {},
      app: { baseURL: "/" },
      ...environmentOptions?.nuxtRuntimeConfig
    },
    data: {},
    state: {}
  };
  const consoleInfo = console.info;
  console.info = (...args) => {
    if (args[0] === "<Suspense> is an experimental feature and its API will likely change.") {
      return;
    }
    return consoleInfo(...args);
  };
  const app = win.document.createElement("div");
  app.id = environmentOptions.nuxt.rootId || "nuxt-test";
  win.document.body.appendChild(app);
  if (!win.fetch || !("Request" in win)) {
    await import("node-fetch-native/polyfill");
    win.URLSearchParams = globalThis.URLSearchParams;
    win.Request ??= class Request extends globalThis.Request {
      constructor(input, init) {
        if (typeof input === "string") {
          super(new URL(input, win.location.origin), init);
        } else {
          super(input, init);
        }
      }
    };
  }
  const res = environmentOptions.nuxt.h3Version === 2 ? await createFetchForH3V2() : await createFetchForH3V1();
  win.fetch = res.fetch;
  win.$fetch = createFetch({ fetch: win.fetch, Headers: win.Headers });
  win.__registry = res.registry;
  win.__app = res.h3App;
  const timestamp = Date.now();
  const routeRulesMatcher = toRouteMatcher(
    createRadixRouter({ routes: environmentOptions.nuxtRouteRules || {} })
  );
  const matcher = exportMatcher(routeRulesMatcher);
  const manifestOutputPath = joinURL(
    environmentOptions?.nuxtRuntimeConfig?.app?.baseURL || "/",
    environmentOptions?.nuxtRuntimeConfig?.app?.buildAssetsDir || "_nuxt",
    "builds"
  );
  const manifestBaseRoutePath = joinURL("/_", manifestOutputPath);
  const buildId = win.__NUXT__.config?.app.buildId || "test";
  res.h3App.use(
    `${manifestBaseRoutePath}/latest.json`,
    defineEventHandler(() => ({
      id: buildId,
      timestamp
    }))
  );
  res.h3App.use(
    `${manifestBaseRoutePath}/meta/${buildId}.json`,
    defineEventHandler(() => ({
      id: buildId,
      timestamp,
      matcher,
      prerendered: []
    }))
  );
  res.registry.add(`${manifestOutputPath}/latest.json`);
  res.registry.add(`${manifestOutputPath}/meta/${buildId}.json`);
  return () => {
    console.info = consoleInfo;
  };
}
