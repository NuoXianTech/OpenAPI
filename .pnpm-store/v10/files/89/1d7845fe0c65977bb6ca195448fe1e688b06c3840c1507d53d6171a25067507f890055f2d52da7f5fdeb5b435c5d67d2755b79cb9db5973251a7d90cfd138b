import destr from 'destr';
import { snakeCase } from 'scule';
import { pathToFileURL } from 'node:url';
import { resolveModulePath } from 'exsolve';

function getEnv(key, opts) {
  const env = opts.env ?? process.env;
  const envKey = snakeCase(key).toUpperCase();
  return destr(
    env[opts.prefix + envKey] ?? env[opts.altPrefix + envKey]
  );
}
function _isObject(input) {
  return typeof input === "object" && !Array.isArray(input);
}
function applyEnv(obj, opts, parentKey = "") {
  for (const key in obj) {
    const subKey = parentKey ? `${parentKey}_${key}` : key;
    const envValue = getEnv(subKey, opts);
    if (_isObject(obj[key])) {
      if (_isObject(envValue)) {
        obj[key] = { ...obj[key], ...envValue };
        applyEnv(obj[key], opts, subKey);
      } else if (envValue === void 0) {
        applyEnv(obj[key], opts, subKey);
      } else {
        obj[key] = envValue ?? obj[key];
      }
    } else {
      obj[key] = envValue ?? obj[key];
    }
  }
  return obj;
}
async function loadKit(rootDir) {
  try {
    const kitPath = resolveModulePath("@nuxt/kit", { from: tryResolveNuxt(rootDir) || rootDir });
    let kit = await import(pathToFileURL(kitPath).href);
    if (!kit.writeTypes) {
      kit = {
        ...kit,
        writeTypes: () => {
          throw new Error("`writeTypes` is not available in this version of `@nuxt/kit`. Please upgrade to v3.7 or newer.");
        }
      };
    }
    return kit;
  } catch (e) {
    if (e.toString().includes("Cannot find module '@nuxt/kit'")) {
      throw new Error(
        "`@nuxt/test-utils` requires `@nuxt/kit` to be installed in your project. Try installing `nuxt` v3+ or `@nuxt/bridge` first."
      );
    }
    throw e;
  }
}
function tryResolveNuxt(rootDir) {
  for (const pkg of ["nuxt-nightly", "nuxt", "nuxt3", "nuxt-edge"]) {
    const path = resolveModulePath(pkg, { from: rootDir, try: true });
    if (path) {
      return path;
    }
  }
  return null;
}

export { applyEnv as a, loadKit as l };
