import defu from 'defu';
import { test as test$1 } from '@playwright/test';
export { expect } from '@playwright/test';
import { isWindows } from 'std-env';
import { w as waitForHydration, d as createTest } from './shared/test-utils.E_cAGA8l.mjs';
import 'node:path';
import 'ufo';
import 'consola';
import 'node:fs';
import 'destr';
import 'scule';
import 'node:url';
import 'exsolve';
import { d as url } from './shared/test-utils.BsmyE2FA.mjs';
import 'pathe';
import '#dirs';
import './shared/test-utils.BIY9XRkB.mjs';
import 'tinyexec';
import 'get-port-please';
import 'ofetch';

const FIXTURE_TIMEOUT = isWindows ? 12e4 : 6e4;
const test = test$1.extend({
  nuxt: [void 0, { option: true, scope: "worker" }],
  defaults: [{ nuxt: void 0 }, { option: true, scope: "worker" }],
  _nuxtHooks: [
    async ({ nuxt, defaults }, use) => {
      const hooks = createTest(defu(nuxt || {}, defaults.nuxt || {}));
      await hooks.beforeAll();
      await use(hooks);
      await hooks.afterAll();
    },
    { scope: "worker", timeout: FIXTURE_TIMEOUT }
  ],
  baseURL: async ({ _nuxtHooks }, use) => {
    _nuxtHooks.beforeEach();
    await use(url("/"));
    _nuxtHooks.afterEach();
  },
  goto: async ({ page }, use) => {
    await use(async (url2, options) => {
      const waitUntil = options?.waitUntil;
      if (waitUntil && ["hydration", "route"].includes(waitUntil)) {
        delete options.waitUntil;
      }
      const response = await page.goto(url2, options);
      await waitForHydration(page, url2, waitUntil);
      return response;
    });
  }
});

export { test };
