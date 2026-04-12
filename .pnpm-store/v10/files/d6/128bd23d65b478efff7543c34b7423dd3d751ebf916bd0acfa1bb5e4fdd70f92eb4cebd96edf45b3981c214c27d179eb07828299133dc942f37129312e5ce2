import { resolveIgnorePatterns, logger, addDevServerHandler, useNuxt, defineNuxtModule, createResolver, resolvePath } from '@nuxt/kit';
import { refreshCustomTabs, addCustomTab, onDevToolsInitialized } from '@nuxt/devtools-kit';
import { extname, join, dirname, relative, resolve } from 'pathe';
import { isCI, hasTTY, provider } from 'std-env';
import { walk } from 'estree-walker';
import MagicString from 'magic-string';
import { createUnplugin } from 'unplugin';
import { l as loadKit } from './shared/test-utils.BIY9XRkB.mjs';
import { readFileSync, existsSync, promises } from 'node:fs';
import process$1 from 'node:process';
import { intro, multiselect, isCancel, cancel, select, confirm, outro } from '@clack/prompts';
import { colors } from 'consola/utils';
import { detectPackageManager, addDependency } from 'nypm';
import { h } from 'vue';
import { debounce } from 'perfect-debounce';
import { fork } from 'node:child_process';
import { l as listenCliMessages, s as sendMessageToCli, c as createVitestTestSummary } from './shared/test-utils.DDUpsMYL.mjs';
import { distDir } from '#dirs';
import 'destr';
import 'scule';
import 'node:url';
import 'exsolve';

const PLUGIN_NAME$1 = "nuxt:vitest:mock-transform";
const HELPER_MOCK_IMPORT = "mockNuxtImport";
const HELPER_MOCK_COMPONENT = "mockComponent";
const HELPER_MOCK_HOIST = "__NUXT_VITEST_MOCKS";
const HELPER_MOCK_HOIST_ORIGINAL = "__NUXT_VITEST_MOCKS_ORIGINAL";
const HELPERS_NAME = [HELPER_MOCK_IMPORT, HELPER_MOCK_COMPONENT];
const createMockPlugin = (ctx) => createUnplugin(() => {
  function transform(code, id) {
    if (!HELPERS_NAME.some((n) => code.includes(n))) return;
    if (id.includes("/node_modules/")) return;
    let ast;
    try {
      ast = this.parse(code, {
        // @ts-expect-error compatibility with rollup v3
        sourceType: "module",
        ecmaVersion: "latest",
        ranges: true
      });
    } catch {
      return;
    }
    let insertionPoint = 0;
    let hasViImport = false;
    const s = new MagicString(code);
    const mocksImport = [];
    const mocksComponent = [];
    const importPathsList = /* @__PURE__ */ new Set();
    walk(ast, {
      enter: (node, parent) => {
        if (isImportDeclaration(node)) {
          if (node.source.value === "vitest" && !hasViImport) {
            const viImport = node.specifiers.find(
              (i) => isImportSpecifier(i) && i.imported.type === "Identifier" && i.imported.name === "vi"
            );
            if (viImport) {
              insertionPoint = endOf(node);
              hasViImport = true;
            }
            return;
          }
        }
        if (!isCallExpression(node)) return;
        if (isIdentifier(node.callee) && node.callee.name === HELPER_MOCK_IMPORT) {
          if (node.arguments.length !== 2) {
            return this.error(
              new Error(
                `${HELPER_MOCK_IMPORT}() should have exactly 2 arguments`
              ),
              startOf(node)
            );
          }
          const importTarget = node.arguments[0];
          const name = isLiteral(importTarget) ? importTarget.value : isIdentifier(importTarget) ? importTarget.name : void 0;
          if (typeof name !== "string") {
            return this.error(
              new Error(
                `The first argument of ${HELPER_MOCK_IMPORT}() must be a string literal or mocked target`
              ),
              startOf(importTarget)
            );
          }
          const importItem = ctx.imports.find((_) => name === (_.as || _.name));
          if (!importItem) {
            return this.error(`Cannot find import "${name}" to mock`);
          }
          s.overwrite(
            isExpressionStatement(parent) ? startOf(parent) : startOf(node.arguments[0]),
            isExpressionStatement(parent) ? endOf(parent) : endOf(node.arguments[1]),
            ""
          );
          mocksImport.push({
            name,
            import: importItem,
            factory: code.slice(
              startOf(node.arguments[1]),
              endOf(node.arguments[1])
            )
          });
        }
        if (isIdentifier(node.callee) && node.callee.name === HELPER_MOCK_COMPONENT) {
          if (node.arguments.length !== 2) {
            return this.error(
              new Error(
                `${HELPER_MOCK_COMPONENT}() should have exactly 2 arguments`
              ),
              startOf(node)
            );
          }
          const componentName = node.arguments[0];
          if (!isLiteral(componentName) || typeof componentName.value !== "string") {
            return this.error(
              new Error(
                `The first argument of ${HELPER_MOCK_COMPONENT}() must be a string literal`
              ),
              startOf(componentName)
            );
          }
          const pathOrName = componentName.value;
          const component = ctx.components.find(
            (_) => _.pascalName === pathOrName || _.kebabName === pathOrName
          );
          const path = component?.filePath || pathOrName;
          s.overwrite(
            isExpressionStatement(parent) ? startOf(parent) : startOf(node.arguments[1]),
            isExpressionStatement(parent) ? endOf(parent) : endOf(node.arguments[1]),
            ""
          );
          mocksComponent.push({
            path,
            factory: code.slice(
              startOf(node.arguments[1]),
              endOf(node.arguments[1])
            )
          });
        }
      }
    });
    if (mocksImport.length === 0 && mocksComponent.length === 0) return;
    const mockLines = [];
    if (mocksImport.length) {
      const mockImportMap = /* @__PURE__ */ new Map();
      for (const mock of mocksImport) {
        if (!mockImportMap.has(mock.import.from)) {
          mockImportMap.set(mock.import.from, []);
        }
        mockImportMap.get(mock.import.from).push(mock);
      }
      mockLines.push(
        ...Array.from(mockImportMap.entries()).flatMap(
          ([from, mocks]) => {
            importPathsList.add(from);
            const quotedFrom = JSON.stringify(from);
            const mockModuleEntry = `globalThis.${HELPER_MOCK_HOIST}[${quotedFrom}]`;
            const lines = [
              `vi.mock(${quotedFrom}, async (importOriginal) => {`,
              `  if (!${mockModuleEntry}) {`,
              `    const original = await importOriginal(${quotedFrom})`,
              `    ${mockModuleEntry} = { ...original }`,
              `    ${mockModuleEntry}.${HELPER_MOCK_HOIST_ORIGINAL} = { ...original }`,
              `  }`
            ];
            for (const mock of mocks) {
              const quotedName = JSON.stringify(mock.import.name === "default" ? "default" : mock.name);
              lines.push(
                `  ${mockModuleEntry}[${quotedName}] = await (${mock.factory})(${mockModuleEntry}.${HELPER_MOCK_HOIST_ORIGINAL}[${quotedName}]);`
              );
            }
            lines.push(`  return ${mockModuleEntry} `);
            lines.push(`});`);
            return lines;
          }
        )
      );
    }
    if (mocksComponent.length) {
      mockLines.push(
        ...mocksComponent.flatMap((mock) => {
          return [
            `vi.mock(${JSON.stringify(mock.path)}, async () => {`,
            `  const factory = (${mock.factory});`,
            `  const result = typeof factory === 'function' ? await factory() : await factory`,
            `  return 'default' in result ? result : { default: result }`,
            "});"
          ];
        })
      );
    }
    if (!mockLines.length) return;
    s.appendLeft(insertionPoint, `
vi.hoisted(() => { 
        if(!globalThis.${HELPER_MOCK_HOIST}){
          vi.stubGlobal(${JSON.stringify(HELPER_MOCK_HOIST)}, {})
        }
      });
`);
    if (!hasViImport) s.prepend(`import {vi} from "vitest";
`);
    s.appendLeft(insertionPoint, "\n" + mockLines.join("\n") + "\n");
    importPathsList.forEach((p) => {
      s.append(`
 import ${JSON.stringify(p)};`);
    });
    return {
      code: s.toString(),
      map: s.generateMap()
    };
  }
  return {
    name: PLUGIN_NAME$1,
    enforce: "post",
    vite: {
      transform,
      // Place Vitest's mock plugin after all Nuxt plugins
      async configResolved(config) {
        const plugins = config.plugins || [];
        const vitestPlugins = plugins.filter((p) => (p.name === "vite:mocks" || p.name.startsWith("vitest:")) && (p.enforce || "order" in p && p.order) === "post");
        const lastNuxt = findLastIndex(
          plugins,
          (i) => !!i?.name?.startsWith("nuxt:")
        );
        if (lastNuxt === -1) return;
        for (const plugin of vitestPlugins) {
          const index = plugins.indexOf(plugin);
          if (index < lastNuxt) {
            plugins.splice(index, 1);
            plugins.splice(lastNuxt, 0, plugin);
          }
        }
      }
    }
  };
});
function findLastIndex(arr, predicate) {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (predicate(arr[i])) return i;
  }
  return -1;
}
function isImportDeclaration(node) {
  return node.type === "ImportDeclaration";
}
function isImportSpecifier(node) {
  return node.type === "ImportSpecifier";
}
function isCallExpression(node) {
  return node.type === "CallExpression";
}
function isIdentifier(node) {
  return node.type === "Identifier";
}
function isLiteral(node) {
  return node.type === "Literal";
}
function isExpressionStatement(node) {
  return node?.type === "ExpressionStatement";
}
function startOf(node) {
  return "range" in node && node.range ? node.range[0] : "start" in node ? node.start : void 0;
}
function endOf(node) {
  return "range" in node && node.range ? node.range[1] : "end" in node ? node.end : void 0;
}

async function setupImportMocking(nuxt) {
  const { addVitePlugin } = await loadKit(nuxt.options.rootDir);
  const ctx = {
    components: [],
    imports: []
  };
  let importsCtx;
  nuxt.hook("imports:context", async (ctx2) => {
    importsCtx = ctx2;
  });
  nuxt.hook("ready", async () => {
    ctx.imports = await importsCtx.getImports();
  });
  nuxt.hook("components:extend", (_) => {
    ctx.components = _;
  });
  nuxt.hook("imports:sources", (presets) => {
    const idx = presets.findIndex((p) => p.imports?.includes("setInterval"));
    if (idx !== -1) {
      presets.splice(idx, 1);
    }
  });
  nuxt.options.ignore = nuxt.options.ignore.filter((i) => i !== "**/*.{spec,test}.{js,cts,mts,ts,jsx,tsx}");
  if (nuxt._ignore) {
    for (const pattern of resolveIgnorePatterns("**/*.{spec,test}.{js,cts,mts,ts,jsx,tsx}")) {
      nuxt._ignore.add(`!${pattern}`);
    }
  }
  addVitePlugin(createMockPlugin(ctx).vite());
}

const PLUGIN_NAME = "nuxt:vitest:nuxt-root-stub";
const STUB_ID = "nuxt-vitest-app-entry";
const NuxtRootStubPlugin = (options) => {
  const extension = extname(options.entry);
  const escapedExt = extension.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const entryPath = join(dirname(options.entry), STUB_ID + extension);
  const idFilter = new RegExp(`${STUB_ID}(?:${escapedExt})?$`);
  return {
    name: PLUGIN_NAME,
    enforce: "pre",
    resolveId: {
      filter: {
        id: idFilter
      },
      async handler(id, importer) {
        return importer?.endsWith("index.html") ? id : entryPath;
      }
    },
    load: {
      filter: {
        id: idFilter
      },
      async handler() {
        const entryContents = readFileSync(options.entry, "utf-8");
        return entryContents.replace("#build/root-component.mjs", options.rootStubPath);
      }
    }
  };
};

function generateVitestConfig(answers) {
  let config = `import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import { defineVitestProject } from '@nuxt/test-utils/config'`;
  if (answers.browserMode) {
    config += `
import { playwright } from '@vitest/browser-playwright'`;
  }
  config += `

export default defineConfig({
`;
  config += `  test: {
    projects: [
`;
  if (answers.testingScope.includes("unit")) {
    config += `      {
        test: {
          name: 'unit',
          include: ['test/unit/*.{test,spec}.ts'],
          environment: 'node',
        },
      },
`;
  }
  config += `      await defineVitestProject({
        test: {
          name: 'nuxt',
          include: ['test/nuxt/*.{test,spec}.ts'],
          environment: 'nuxt',
          environmentOptions: {
            nuxt: {
              rootDir: fileURLToPath(new URL('.', import.meta.url)),${answers.browserMode ? "" : `
              domEnvironment: '${answers.domEnvironment || "happy-dom"}',`}
            },
          },${answers.browserMode ? `
          browser: {
            enabled: true,
            provider: playwright(),
            instances: [
              { browser: 'chromium' },
            ],
          },` : ""}
        },
      }),
`;
  if (answers.testingScope.includes("e2e") && answers.e2eRunner === "vitest") {
    config += `      {
        test: {
          name: 'e2e',
          include: ['test/e2e/*.{test,spec}.ts'],
          environment: 'node',
        },
      },
`;
  }
  config += `    ],
`;
  if (answers.coverage) {
    config += `    coverage: {
      enabled: true,
      provider: 'v8',
    },
`;
  }
  config += `  },
`;
  config += `})
`;
  return config;
}
function generatePlaywrightConfig() {
  return `import { fileURLToPath } from 'node:url'
import { defineConfig, devices } from '@playwright/test'
import type { ConfigOptions } from '@nuxt/test-utils/playwright'

export default defineConfig<ConfigOptions>({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    trace: 'on-first-retry',
    nuxt: {
      rootDir: fileURLToPath(new URL('.', import.meta.url)),
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
`;
}
function getDependencies(answers) {
  const dependencies = [];
  if (answers.testingScope.includes("unit") || answers.testingScope.includes("runtime")) {
    dependencies.push("vitest", "@vue/test-utils");
    if (answers.domEnvironment) {
      dependencies.push(answers.domEnvironment);
    }
    if (answers.browserMode) {
      dependencies.push("@vitest/browser-playwright");
    }
  }
  if (answers.e2eRunner === "playwright") {
    dependencies.push("@playwright/test", "playwright-core");
  } else if (answers.e2eRunner === "cucumber") {
    dependencies.push("@cucumber/cucumber");
  } else if (answers.e2eRunner === "jest") {
    dependencies.push("@jest/globals");
  }
  if (answers.coverage) {
    dependencies.push("@vitest/coverage-v8");
  }
  return dependencies;
}
function getPackageScripts(answers) {
  const scripts = {};
  if (answers.testingScope.includes("unit") || answers.testingScope.includes("runtime")) {
    scripts.test = "vitest";
    scripts["test:watch"] = "vitest --watch";
    if (answers.coverage) {
      scripts["test:coverage"] = "vitest --coverage";
    }
    if (answers.testingScope.includes("unit")) {
      scripts["test:unit"] = "vitest --project unit";
    }
    scripts["test:nuxt"] = "vitest --project nuxt";
    if (answers.testingScope.includes("e2e") && answers.e2eRunner === "vitest") {
      scripts["test:e2e"] = "vitest --project e2e";
    }
  }
  if (answers.e2eRunner === "playwright") {
    scripts["test:e2e"] = "playwright test";
    scripts["test:e2e:ui"] = "playwright test --ui";
  }
  return scripts;
}
async function runInstallWizard(nuxt) {
  if (isCI || !hasTTY || nuxt.options.test) {
    return;
  }
  if (nuxt.options.workspaceDir && nuxt.options.workspaceDir !== nuxt.options.rootDir) {
    logger.info("Monorepo detected. Skipping setup wizard.");
    return;
  }
  const rootDir = nuxt.options.rootDir;
  const hasVitestConfig = existsSync(join(rootDir, "vitest.config.ts")) || existsSync(join(rootDir, "vitest.config.js")) || existsSync(join(rootDir, "vitest.config.mts")) || existsSync(join(rootDir, "vitest.config.mjs"));
  const hasPlaywrightConfig = existsSync(join(rootDir, "playwright.config.ts")) || existsSync(join(rootDir, "playwright.config.js"));
  if (hasVitestConfig || hasPlaywrightConfig) {
    logger.info("Test configuration already exists. Skipping setup wizard.");
    return;
  }
  intro(colors.bold(colors.cyan("\u{1F9EA} Nuxt Test Utils Setup")));
  const answers = {};
  const testingScope = await multiselect({
    message: "What kind of tests will you need?",
    options: [
      {
        value: "runtime",
        label: "Runtime",
        hint: "components or composables running in a Nuxt runtime environment"
      },
      {
        value: "unit",
        label: "Unit tests",
        hint: "pure functions or build-time/Node tests"
      },
      {
        value: "e2e",
        label: "End-to-end",
        hint: "full application flows in browser"
      }
    ],
    required: true
  });
  if (isCancel(testingScope)) {
    cancel("Setup cancelled.");
    process$1.exit(0);
  }
  answers.testingScope = testingScope;
  const needsVitest = answers.testingScope.includes("unit") || answers.testingScope.includes("runtime");
  const needsE2E = answers.testingScope.includes("e2e");
  if (answers.testingScope.includes("runtime")) {
    const domEnvironment = await select({
      message: "Which Vitest environment would you like to use for runtime tests?",
      options: [
        {
          value: "happy-dom",
          label: "happy-dom",
          hint: "recommended - faster, lighter"
        },
        {
          value: "jsdom",
          label: "jsdom",
          hint: "more complete browser simulation"
        },
        {
          value: "browser",
          label: "browser mode",
          hint: "real browser with Playwright"
        }
      ],
      initialValue: "happy-dom"
    });
    if (isCancel(domEnvironment)) {
      cancel("Setup cancelled.");
      process$1.exit(0);
    }
    if (domEnvironment === "browser") {
      answers.browserMode = true;
    } else {
      answers.domEnvironment = domEnvironment;
    }
  }
  if (needsE2E) {
    const e2eRunner = await select({
      message: "Which end-to-end test runner would you like to use?",
      options: [
        {
          value: "playwright",
          label: "Playwright",
          hint: "recommended - modern, multi-browser"
        },
        {
          value: "vitest",
          label: "Vitest",
          hint: "same runner as unit tests"
        },
        {
          value: "cucumber",
          label: "Cucumber",
          hint: "behavior-driven development"
        },
        {
          value: "jest",
          label: "Jest",
          hint: "legacy test runner"
        }
      ],
      initialValue: "playwright"
    });
    if (isCancel(e2eRunner)) {
      cancel("Setup cancelled.");
      process$1.exit(0);
    }
    answers.e2eRunner = e2eRunner;
  }
  if (needsVitest) {
    const coverage = await confirm({
      message: "Would you like to set up test coverage?",
      initialValue: false
    });
    if (isCancel(coverage)) {
      cancel("Setup cancelled.");
      process$1.exit(0);
    }
    answers.coverage = coverage;
  }
  const exampleTests = await confirm({
    message: "Create example test files?",
    initialValue: true
  });
  if (isCancel(exampleTests)) {
    cancel("Setup cancelled.");
    process$1.exit(0);
  }
  answers.exampleTests = exampleTests;
  await performSetup(nuxt, answers);
  outro(colors.green("\u2728 Test setup complete!"));
}
async function performSetup(nuxt, answers) {
  const rootDir = nuxt.options.rootDir;
  const packageManager = await detectPackageManager(rootDir);
  logger.info("Installing dependencies...");
  const dependencies = getDependencies(answers);
  if (dependencies.length > 0) {
    try {
      await addDependency(dependencies, {
        cwd: rootDir,
        dev: true,
        packageManager
      });
    } catch (error) {
      logger.error("Failed to install dependencies:", error);
      return;
    }
  }
  if (answers.testingScope.includes("unit") || answers.testingScope.includes("runtime")) {
    await createVitestConfig(nuxt, answers);
  }
  if (answers.e2eRunner === "playwright") {
    await createPlaywrightConfig(nuxt);
  }
  await createTestDirectories(nuxt, answers);
  if (answers.exampleTests) {
    await createExampleTests(nuxt, answers);
  }
  await updatePackageScripts(nuxt, answers);
  await updateGitignore(nuxt, answers);
}
async function createVitestConfig(nuxt, answers) {
  const rootDir = nuxt.options.rootDir;
  const configPath = join(rootDir, "vitest.config.ts");
  const config = generateVitestConfig(answers);
  await promises.writeFile(configPath, config, "utf-8");
  logger.success(`Created ${colors.cyan(relative(process$1.cwd(), configPath))}`);
}
async function createPlaywrightConfig(nuxt) {
  const rootDir = nuxt.options.rootDir;
  const configPath = join(rootDir, "playwright.config.ts");
  const config = generatePlaywrightConfig();
  await promises.writeFile(configPath, config, "utf-8");
  logger.success(`Created ${colors.cyan(relative(process$1.cwd(), configPath))}`);
}
async function createTestDirectories(nuxt, answers) {
  const rootDir = nuxt.options.rootDir;
  if (answers.testingScope.includes("unit")) {
    const unitDir = join(rootDir, "test/unit");
    await promises.mkdir(unitDir, { recursive: true });
    logger.success(`Created ${colors.cyan(relative(process$1.cwd(), unitDir))}`);
  }
  if (answers.testingScope.includes("runtime")) {
    const nuxtDir = join(rootDir, "test/nuxt");
    await promises.mkdir(nuxtDir, { recursive: true });
    logger.success(`Created ${colors.cyan(relative(process$1.cwd(), nuxtDir))}`);
  }
  if (answers.testingScope.includes("e2e")) {
    const e2eDir = answers.e2eRunner === "playwright" ? join(rootDir, "tests") : join(rootDir, "test/e2e");
    await promises.mkdir(e2eDir, { recursive: true });
    logger.success(`Created ${colors.cyan(relative(process$1.cwd(), e2eDir))}`);
  }
}
async function createExampleTests(nuxt, answers) {
  const rootDir = nuxt.options.rootDir;
  if (answers.testingScope.includes("unit")) {
    const unitTestPath = join(rootDir, "test/unit/example.test.ts");
    const unitTest = `import { describe, expect, it } from 'vitest'

describe('example unit test', () => {
  it('should pass', () => {
    expect(1 + 1).toBe(2)
  })
})
`;
    await promises.writeFile(unitTestPath, unitTest, "utf-8");
    logger.success(`Created ${colors.cyan(relative(process$1.cwd(), unitTestPath))}`);
  }
  if (answers.testingScope.includes("runtime")) {
    const componentTestPath = join(rootDir, "test/nuxt/component.test.ts");
    const componentTest = `import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { defineComponent, h } from 'vue'

describe('component test example', () => {
  it('can mount components', async () => {
    const TestComponent = defineComponent({
      setup() {
        return () => h('div', 'Hello Nuxt!')
      },
    })
    
    const component = await mountSuspended(TestComponent)
    
    expect(component.text()).toBe('Hello Nuxt!')
  })
})
`;
    await promises.writeFile(componentTestPath, componentTest, "utf-8");
    logger.success(`Created ${colors.cyan(relative(process$1.cwd(), componentTestPath))}`);
  }
  if (answers.testingScope.includes("e2e")) {
    if (answers.e2eRunner === "playwright") {
      const e2eTestPath = join(rootDir, "tests/example.spec.ts");
      const e2eTest = `import { expect, test } from '@nuxt/test-utils/playwright'

test('example e2e test', async ({ page, goto }) => {
  await goto('/', { waitUntil: 'hydration' })
  await expect(page).toHaveTitle(/Nuxt/)
})
`;
      await promises.writeFile(e2eTestPath, e2eTest, "utf-8");
      logger.success(`Created ${colors.cyan(relative(process$1.cwd(), e2eTestPath))}`);
    } else {
      const e2eTestPath = join(rootDir, "test/e2e/example.test.ts");
      const e2eTest = `import { describe, expect, it } from 'vitest'
import { $fetch, setup } from '@nuxt/test-utils/e2e'

describe('example e2e test', async () => {
  await setup()

  it('renders the index page', async () => {
    const html = await $fetch('/')
    expect(html).toContain('Nuxt')
  })
})
`;
      await promises.writeFile(e2eTestPath, e2eTest, "utf-8");
      logger.success(`Created ${colors.cyan(relative(process$1.cwd(), e2eTestPath))}`);
    }
  }
}
async function updatePackageScripts(nuxt, answers) {
  const rootDir = nuxt.options.rootDir;
  const packageJsonPath = join(rootDir, "package.json");
  const packageJson = JSON.parse(await promises.readFile(packageJsonPath, "utf-8"));
  packageJson.scripts = packageJson.scripts || {};
  const newScripts = getPackageScripts(answers);
  Object.assign(packageJson.scripts, newScripts);
  await promises.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2) + "\n", "utf-8");
  logger.success("Updated package.json scripts");
}
async function updateGitignore(nuxt, answers) {
  const rootDir = nuxt.options.rootDir;
  const gitignorePath = join(rootDir, ".gitignore");
  let gitignore = "";
  if (existsSync(gitignorePath)) {
    gitignore = await promises.readFile(gitignorePath, "utf-8");
  }
  const lines = [];
  if (answers.coverage && !gitignore.includes("coverage")) {
    lines.push("# Test coverage", "coverage/", "");
  }
  if (answers.e2eRunner === "playwright") {
    if (!gitignore.includes("playwright-report")) {
      lines.push("# Playwright", "playwright-report/", "test-results/", "");
    }
  }
  if (lines.length > 0) {
    gitignore += "\n" + lines.join("\n");
    await promises.writeFile(gitignorePath, gitignore, "utf-8");
    logger.success("Updated .gitignore");
  }
}

async function setupDevTools(vitestWrapper, nuxt = useNuxt()) {
  const iframeSrc = "/__test_utils_vitest__/";
  const updateTabs = debounce(() => {
    refreshCustomTabs(nuxt);
  }, 100);
  addCustomTab(() => createVitestCustomTab(vitestWrapper, { iframeSrc }), nuxt);
  addDevServerHandler({
    route: iframeSrc,
    handler: Object.assign(() => iframeContentHtml(vitestWrapper.uiUrl), { __is_handler__: true })
  });
  vitestWrapper.ons({
    started() {
      updateTabs();
    },
    updated() {
      updateTabs();
    },
    finished() {
      updateTabs();
    },
    exited() {
      updateTabs();
    }
  });
}
function createVitestCustomTab(vitest, { iframeSrc }) {
  const launchView = {
    type: "launch",
    description: "Start tests along with Nuxt",
    actions: [
      {
        get label() {
          switch (vitest.status) {
            case "starting":
              return "Starting...";
            case "running":
              return "Running Vitest";
            case "stopped":
              return "Start Vitest";
            case "finished":
              return "Start Vitest";
          }
        },
        get pending() {
          return vitest.status === "starting" || vitest.status === "running";
        },
        handle: () => {
          vitest.start();
        }
      }
    ]
  };
  const uiView = {
    type: "iframe",
    persistent: false,
    src: iframeSrc
  };
  const tab = {
    title: "Vitest",
    name: "vitest",
    icon: "logos-vitest",
    get view() {
      if (vitest.status === "stopped" || vitest.status === "starting" || !vitest.uiUrl) {
        return launchView;
      } else {
        return uiView;
      }
    },
    extraTabVNode: vitest.testSummary.totalCount ? h("div", { style: { color: vitest.testSummary.failedCount ? "orange" : "green" } }, [
      h("span", {}, vitest.testSummary.passedCount),
      h("span", { style: { opacity: "0.5", fontSize: "0.9em" } }, "/"),
      h(
        "span",
        { style: { opacity: "0.8", fontSize: "0.9em" } },
        vitest.testSummary.totalCount
      )
    ]) : void 0
  };
  return tab;
}
function iframeContentHtml(uiUrl) {
  return [
    "<html><head><script>",
    `(${function redirect(uiUrl2, provider2) {
      if (typeof window === "undefined") return;
      if (!uiUrl2) return;
      if (provider2 === "stackblitz") {
        const url = new URL(window.location.href);
        const newUrl = new URL(uiUrl2);
        newUrl.host = url.host.replace(/--\d+--/, `--${newUrl.port}--`);
        newUrl.protocol = url.protocol;
        newUrl.port = url.port;
        uiUrl2 = newUrl.toString();
      }
      window.location.replace(uiUrl2);
    }})(${JSON.stringify(uiUrl)}, ${JSON.stringify(provider)})`,
    "<\/script></head></html>"
  ].join("\n");
}

function vitestWrapper(options) {
  const { cwd, ...startOptions } = options;
  let _status = "stopped";
  let _uiUrl;
  let _process;
  let _testSummary = createVitestTestSummary();
  const _handlers = {
    started: [({ uiUrl }) => {
      _uiUrl = uiUrl;
      _status = "running";
      _testSummary = createVitestTestSummary();
    }],
    updated: [(summary) => {
      _testSummary = summary;
    }],
    finished: [(summary) => {
      _status = "finished";
      _testSummary = summary;
    }],
    exited: [clear]
  };
  function clear() {
    _status = "stopped";
    _uiUrl = void 0;
    _process = void 0;
    _testSummary = createVitestTestSummary();
  }
  function on(name, handler) {
    _handlers[name] ??= [];
    _handlers[name]?.push(handler);
  }
  function ons(handlers) {
    for (const [name, handler] of Object.entries(handlers)) {
      if (typeof handler === "function") {
        on(name, handler);
      }
    }
  }
  async function stop() {
    const vitest = _process;
    if (!vitest || vitest.exitCode !== null) return;
    return new Promise((resolve2) => {
      vitest.once("exit", () => resolve2());
      sendMessageToCli(vitest, "stop", { force: true });
    });
  }
  async function start() {
    if (_process) return false;
    const vitest = fork(resolve(distDir, "./vitest-wrapper/cli.mjs"), {
      cwd,
      env: {
        ...process.env,
        NODE_ENV: "test",
        MODE: "test"
      },
      stdio: startOptions.logToConsole ? void 0 : ["ignore", "ignore", "inherit", "ipc"]
    });
    _status = "starting";
    _process = vitest;
    vitest.once("exit", () => {
      _handlers.exited.forEach((fn) => fn({ exitCode: vitest.exitCode ?? 0 }));
    });
    listenCliMessages(vitest, ({ type, payload }) => {
      _handlers[type].forEach((fn) => fn(payload));
    });
    sendMessageToCli(vitest, "start", startOptions);
    return true;
  }
  return {
    on,
    ons,
    stop,
    start,
    get uiUrl() {
      return _uiUrl;
    },
    get options() {
      return options;
    },
    get status() {
      return _status;
    },
    get testSummary() {
      return { ..._testSummary };
    }
  };
}

const version = "4.0.0";
const pkg = {
	version: version};

const module$1 = defineNuxtModule({
  meta: {
    name: "@nuxt/test-utils",
    configKey: "testUtils",
    version: pkg.version
  },
  defaults: {
    startOnBoot: false,
    logToConsole: false
  },
  async onInstall(nuxt) {
    await runInstallWizard(nuxt);
  },
  async setup(options, nuxt) {
    if (nuxt.options.test || nuxt.options.dev) {
      await setupImportMocking(nuxt);
    }
    const { addVitePlugin } = await loadKit(nuxt.options.rootDir);
    const resolver = createResolver(import.meta.url);
    if (nuxt.options.test || nuxt.options.dev) {
      addVitePlugin(NuxtRootStubPlugin({
        entry: await resolvePath("#app/entry", { alias: nuxt.options.alias }),
        rootStubPath: await resolvePath(resolver.resolve("./runtime/nuxt-root"))
      }));
    }
    if (!nuxt.options.test && !nuxt.options.dev) {
      nuxt.options.vite.define ||= {};
      nuxt.options.vite.define["import.meta.vitest"] = "undefined";
    }
    nuxt.hook("prepare:types", (ctx) => {
      ctx.references.push({ types: "vitest/import-meta" });
      if (ctx.nodeTsConfig) {
        ctx.nodeTsConfig.include ||= [];
        ctx.nodeTsConfig.include.push(relative(nuxt.options.buildDir, join(nuxt.options.rootDir, "vitest.config.*")));
        if (nuxt.options.workspaceDir !== nuxt.options.rootDir) {
          ctx.nodeTsConfig.include.push(relative(nuxt.options.buildDir, join(nuxt.options.workspaceDir, "vitest.config.*")));
        }
      }
    });
    if (!nuxt.options.dev) return;
    if (process.env.TEST || process.env.VITE_TEST) return;
    const vitestWrapper2 = createVitestWrapper(options, nuxt);
    onDevToolsInitialized(async () => {
      await setupDevTools(vitestWrapper2, nuxt);
    }, nuxt);
    if (options.startOnBoot) {
      vitestWrapper2.start();
    }
  }
});
function createVitestWrapper(options, nuxt = useNuxt()) {
  const watchMode = !isCI;
  const wrapper = vitestWrapper({
    cwd: nuxt.options.rootDir,
    apiPorts: [15555],
    logToConsole: options.logToConsole ?? false,
    watchMode
  });
  wrapper.ons({
    started({ uiUrl }) {
      if (watchMode) {
        logger.info(`Vitest UI starting on ${uiUrl}`);
      }
    },
    exited({ exitCode }) {
      if (watchMode) {
        logger.info(`Vitest exited with code ${exitCode}`);
      } else {
        nuxt.close().finally(() => process.exit(exitCode));
      }
    }
  });
  nuxt.hooks.addHooks({
    close: () => wrapper.stop(),
    restart: () => wrapper.stop()
  });
  return wrapper;
}

export { module$1 as default };
