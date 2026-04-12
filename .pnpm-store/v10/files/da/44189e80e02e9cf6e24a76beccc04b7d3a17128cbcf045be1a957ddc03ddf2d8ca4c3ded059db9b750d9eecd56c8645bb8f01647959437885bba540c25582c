import { indexedDB } from 'fake-indexeddb';
import { joinURL } from 'ufo';
import defu from 'defu';
import { populateGlobal } from 'vitest/environments';
import { createFetch } from 'ofetch';
import { toRouteMatcher, createRouter, exportMatcher } from 'radix3';
import { importModule } from 'local-pkg';

function defineEventHandler(handler) {
  return Object.assign(handler, { __is_handler__: true });
}

async function createFetchForH3V1() {
  const [{ createApp, toNodeListener }, { fetchNodeRequestHandler }] = await Promise.all([
    import('h3'),
    import('node-mock-http')
  ]);
  const h3App = createApp();
  const nodeHandler = toNodeListener(h3App);
  const registry = /* @__PURE__ */ new Set();
  const _fetch = fetch;
  const h3Fetch = (async (input, _init) => {
    let url;
    let init = _init;
    if (typeof input === "string") {
      url = input;
    } else if (input instanceof URL) {
      url = input.toString();
    } else {
      url = input.url;
      init = {
        method: init?.method ?? input.method,
        body: init?.body ?? input.body,
        headers: init?.headers ?? input.headers
      };
    }
    const base = url.split("?")[0];
    if (registry.has(base) || registry.has(url)) {
      url = "/_" + url;
    }
    if (url.startsWith("/")) {
      const response = await fetchNodeRequestHandler(nodeHandler, url, init);
      return normalizeFetchResponse(response);
    }
    return _fetch(input, _init);
  });
  return {
    h3App,
    registry,
    fetch: h3Fetch
  };
}
function normalizeFetchResponse(response) {
  if (!response.headers.has("set-cookie")) {
    return response;
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: normalizeCookieHeaders(response.headers)
  });
}
function normalizeCookieHeader(header = "") {
  return splitCookiesString(joinHeaders(header));
}
function normalizeCookieHeaders(headers) {
  const outgoingHeaders = new Headers();
  for (const [name, header] of headers) {
    if (name === "set-cookie") {
      for (const cookie of normalizeCookieHeader(header)) {
        outgoingHeaders.append("set-cookie", cookie);
      }
    } else {
      outgoingHeaders.set(name, joinHeaders(header));
    }
  }
  return outgoingHeaders;
}
function joinHeaders(value) {
  return Array.isArray(value) ? value.join(", ") : String(value);
}

async function createFetchForH3V2() {
  const { H3 } = await import('h3-next/generic');
  const h3App = new H3();
  const registry = /* @__PURE__ */ new Set();
  const _fetch = fetch;
  const h3Fetch = (async (input, _init) => {
    let url;
    let init = _init;
    if (typeof input === "string") {
      url = input;
    } else if (input instanceof URL) {
      url = input.toString();
    } else {
      url = input.url;
      init = {
        method: init?.method ?? input.method,
        body: init?.body ?? input.body,
        headers: init?.headers ?? input.headers
      };
    }
    const base = url.split("?")[0];
    if (registry.has(base) || registry.has(url)) {
      return h3App.fetch(new Request("/_" + url, init));
    }
    if (url.startsWith("/")) {
      return new Response("Not Found", { status: 404, statusText: "Not Found" });
    }
    return _fetch(input, _init);
  });
  return {
    h3App,
    registry,
    fetch: h3Fetch
  };
}

async function setupWindow(win, environmentOptions) {
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
    await import('node-fetch-native/polyfill');
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
    createRouter({ routes: environmentOptions.nuxtRouteRules || {} })
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

const happyDom = (async function(_, { happyDom = {} }) {
  const { Window, GlobalWindow } = await importModule("happy-dom");
  const window = new (GlobalWindow || Window)(happyDom);
  return {
    window,
    teardown() {
      window.happyDOM.abort();
    }
  };
});

const jsdom = (async function(global, { jsdom = {} }) {
  const { CookieJar, JSDOM, ResourceLoader, VirtualConsole } = await importModule("jsdom");
  const jsdomOptions = defu(jsdom, {
    html: "<!DOCTYPE html>",
    url: "http://localhost:3000",
    contentType: "text/html",
    pretendToBeVisual: true,
    includeNodeLocations: false,
    runScripts: "dangerously",
    console: false,
    cookieJar: false
  });
  const virtualConsole = jsdomOptions.console && global.console ? new VirtualConsole() : void 0;
  const window = new JSDOM(jsdomOptions.html, {
    ...jsdomOptions,
    resources: jsdomOptions.resources ?? (jsdomOptions.userAgent ? new ResourceLoader({ userAgent: jsdomOptions.userAgent }) : void 0),
    virtualConsole: virtualConsole ? "sendTo" in virtualConsole ? virtualConsole.sendTo(global.console) : virtualConsole.forwardTo(global.console) : void 0,
    cookieJar: jsdomOptions.cookieJar ? new CookieJar() : void 0
  }).window;
  window.scrollTo = () => {
  };
  return {
    window,
    teardown() {
      window.close();
    }
  };
});

const environmentMap = {
  "happy-dom": happyDom,
  jsdom
};
const index = {
  name: "nuxt",
  viteEnvironment: "client",
  async setup(global, environmentOptions) {
    const url = joinURL(
      environmentOptions.nuxt?.url ?? "http://localhost:3000",
      environmentOptions.nuxtRuntimeConfig?.app?.baseURL || "/"
    );
    const environmentName = environmentOptions.nuxt?.domEnvironment;
    const environment = environmentMap[environmentName] || environmentMap["happy-dom"];
    const { window: win, teardown } = await environment(global, defu(environmentOptions, {
      happyDom: { url },
      jsdom: { url }
    }));
    if (environmentOptions.nuxt?.mock?.intersectionObserver) {
      win.IntersectionObserver ||= IntersectionObserver;
    }
    if (environmentOptions.nuxt?.mock?.indexedDb) {
      win.indexedDB = indexedDB;
    }
    const teardownWindow = await setupWindow(win, environmentOptions);
    const { keys, originals } = populateGlobal(global, win, {
      bindFunctions: true,
      additionalKeys: ["fetch", "Request"]
    });
    return {
      // called after all tests with this env have been run
      teardown() {
        keys.forEach((key) => delete global[key]);
        teardownWindow();
        originals.forEach((v, k) => global[k] = v);
        if (!global.IntersectionObserver) {
          global.IntersectionObserver = IntersectionObserver;
        }
        teardown();
      }
    };
  }
};
class IntersectionObserver {
  observe() {
  }
  unobserve() {
  }
  disconnect() {
  }
  takeRecords() {
    return [];
  }
}

export { index as default };
