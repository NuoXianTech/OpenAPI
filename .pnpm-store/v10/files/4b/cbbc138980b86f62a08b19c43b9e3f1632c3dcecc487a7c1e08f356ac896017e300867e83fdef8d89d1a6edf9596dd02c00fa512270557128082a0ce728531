import { useNuxt, addVitePlugin, addTemplate, resolvePath, logger, defineNuxtModule, createResolver, addImports } from '@nuxt/kit';
import { readFile } from 'node:fs/promises';
import { resolveModulePath } from 'exsolve';
import { join } from 'pathe';

const name = "@nuxtjs/tailwindcss";
const version = "7.0.0-beta.1";
const configKey = "tailwindcss";
const compatibility = {
	nuxt: ">=3.0.0"
};

async function installPlugin(nuxt = useNuxt()) {
  if (nuxt.options.builder === "@nuxt/vite-builder") {
    const existsTailwindPlugin = (plugins = nuxt.options.vite.plugins) => !!plugins?.some((plugin) => {
      if (Array.isArray(plugin)) {
        return existsTailwindPlugin(plugin);
      }
      return plugin && "name" in plugin && plugin.name.startsWith("@tailwindcss/vite");
    });
    if (!existsTailwindPlugin()) {
      await import('@tailwindcss/vite').then((r) => addVitePlugin(r.default()));
    }
  } else {
    nuxt.options.postcss ??= { plugins: {}, order: [] };
    nuxt.options.postcss.plugins ??= {};
    if (!nuxt.options.postcss.plugins["@tailwindcss/postcss"]) {
      nuxt.options.postcss.plugins["@tailwindcss/postcss"] = {};
    }
  }
}

const IMPORT_REGEX = /(?<=\s|^|;|\})@import\s+["']tailwindcss["']/gmu;
const getDefaults = (nuxtConfig) => [
  "css/tailwind.css",
  "css/main.css",
  "css/styles.css"
].map((defaultPath) => join(nuxtConfig.srcDir, nuxtConfig.dir?.assets || "assets", defaultPath));
async function importCSS(nuxt = useNuxt()) {
  const sources = nuxt.options._layers.map((layer) => ({ type: "path", source: layer.config.srcDir || layer.cwd }));
  const sourceConfigs = [
    nuxt.options.app?.head?.htmlAttrs?.class,
    nuxt.options.app?.head?.bodyAttrs?.class
  ];
  sourceConfigs.forEach((value) => {
    if (value && typeof value === "string") sources.push({ type: "inline", source: value });
  });
  await nuxt.callHook("tailwindcss:sources:extend", sources);
  const sourcesTemplate = addTemplate({
    filename: "tailwindcss/sources.css",
    getContents: () => sources.map((s) => `@source ${s.type === "path" ? JSON.stringify(s.source) : `${s.type}(${s.source})`};`).join("\n"),
    write: true
  });
  const filesImportingTailwind = [];
  const projectCSSFiles = await Promise.all(nuxt.options.css.map((p) => resolvePath(p)));
  for (let i = 0; i < nuxt.options._layers.length; i++) {
    const layer = nuxt.options._layers[i];
    const resolvedCSSFiles = [];
    if (i === 0) {
      resolvedCSSFiles.push(...projectCSSFiles);
    } else if (layer.config.css) {
      await Promise.all(layer.config.css.filter((p) => typeof p === "string").map((p) => resolvePath(p))).then((files) => resolvedCSSFiles.push(...files));
    }
    const analyzedFiles = await Promise.all([.../* @__PURE__ */ new Set([...getDefaults(layer.config), ...resolvedCSSFiles])].map(async (file2) => {
      const fileContents = await readFile(file2, { encoding: "utf-8" }).catch(() => "");
      return [file2, { hasImport: IMPORT_REGEX.test(fileContents), isInNuxt: projectCSSFiles.includes(file2) }];
    })).then((files) => files.filter((file2) => file2[1].hasImport));
    if (analyzedFiles.length) {
      filesImportingTailwind.push(...analyzedFiles);
      break;
    }
  }
  const tailwindPath = resolveModulePath("tailwindcss", { from: import.meta.url, conditions: ["style"] });
  const [file, { isInNuxt } = {}] = filesImportingTailwind.length === 0 ? [
    addTemplate({
      filename: "tailwind.css",
      getContents: () => [`@import ${JSON.stringify(tailwindPath)};`, `@import ${JSON.stringify(sourcesTemplate.dst)};`].join("\n"),
      write: true
    }).dst
  ] : filesImportingTailwind.find((file2) => file2[1].isInNuxt) || filesImportingTailwind.pop();
  if (!isInNuxt) {
    nuxt.options.css.unshift(file);
  }
  nuxt.options.alias["#tailwindcss"] = file;
  nuxt.options.alias["#tailwindcss/sources"] = sourcesTemplate.dst;
  nuxt.hook("builder:watch", (_e, path) => {
    if (path !== file && projectCSSFiles.includes(path)) {
      readFile(file, { encoding: "utf-8" }).then((fileContents) => {
        if (IMPORT_REGEX.test(fileContents)) {
          logger.withTag("@nuxtjs/tailwindcss").warn(`New import for \`tailwindcss\` detected in ${file}. Restart server.`);
        }
      });
    }
  });
}

const module = defineNuxtModule({
  meta: {
    name,
    version,
    configKey,
    compatibility
  },
  async setup(moduleOptions, nuxt) {
    const resolver = createResolver(import.meta.url);
    await installPlugin(nuxt);
    addImports([
      { name: "autocompleteUtil", from: resolver.resolve("./runtime/utils"), as: "tw" }
    ]);
    nuxt.hook("modules:done", async () => {
      await importCSS(nuxt);
    });
  }
});

export { module as default };
