import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { defineNuxtModule, createResolver, addComponentsDir, addComponent } from '@nuxt/kit';
import { parseSync } from 'oxc-parser';

function isComponentDirConfig(value) {
  return typeof value === "object" && value !== null && "path" in value;
}
function normalizeComponentDirs(componentDir, fallbackPrefix) {
  const dirs = Array.isArray(componentDir) ? componentDir : [componentDir];
  return dirs.filter((dir) => Boolean(dir)).map((dir) => {
    if (typeof dir === "string")
      return { path: dir, prefix: fallbackPrefix };
    if (isComponentDirConfig(dir))
      return { path: dir.path, prefix: dir.prefix ?? fallbackPrefix };
    throw new Error("Invalid componentDir entry provided to shadcn module.");
  });
}
const module = defineNuxtModule({
  meta: {
    name: "shadcn",
    configKey: "shadcn"
  },
  defaults: {
    prefix: "Ui",
    componentDir: "@/components/ui"
  },
  async setup({ prefix, componentDir }, nuxt) {
    const ROOT_DIR_PATH = nuxt.options.rootDir;
    const { resolve, resolvePath } = createResolver(ROOT_DIR_PATH);
    const normalizedDirs = normalizeComponentDirs(componentDir ?? "@/components/ui", prefix ?? "Ui");
    await Promise.all(normalizedDirs.map(async ({ path, prefix: dirPrefix }) => {
      const componentsPath = await resolvePath(path);
      if (!existsSync(componentsPath)) {
        console.warn(`Component directory does not exist: ${componentsPath}`);
        return;
      }
      addComponentsDir({
        path: componentsPath,
        extensions: [],
        ignore: ["**/*"]
      }, {
        prepend: true
      });
      try {
        await Promise.all(readdirSync(componentsPath).map(async (dir) => {
          try {
            const filePath = await resolvePath(join(path, dir, "index"), { extensions: [".ts", ".js"] });
            const content = readFileSync(filePath, { encoding: "utf8" });
            const ast = parseSync(filePath, content, {
              sourceType: "module"
            });
            const exportedKeys = ast.program.body.filter((node) => node.type === "ExportNamedDeclaration").flatMap((node) => node.specifiers?.map((specifier) => specifier.exported?.name) || []).filter((key) => /^[A-Z]/.test(key));
            exportedKeys.forEach((key) => {
              addComponent({
                name: `${dirPrefix}${key}`,
                // name of the component to be used in vue templates
                export: key,
                // (optional) if the component is a named (rather than default) export
                filePath: resolve(filePath),
                priority: 1
              });
            });
          } catch (err) {
            if (err instanceof Error)
              console.warn("Module error: ", err.message);
          }
        }));
      } catch (err) {
        if (err instanceof Error)
          console.warn(err.message);
      }
    }));
  }
});

export { module as default };
