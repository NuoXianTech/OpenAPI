import { createRequire as __cjs_createRequire } from "node:module";
const __cjs_require = __cjs_createRequire(import.meta.url);
import { a as globalLogger, c as matchPattern, f as resolveComma, h as toArray, i as getNameLabel, m as slash, n as createLogger, p as resolveRegex, r as generateColor, u as pkgExists } from "./logger-s1ImI5j1.mjs";
import { access, cp, readFile, rm, stat } from "node:fs/promises";
import path, { dirname, extname, normalize, sep } from "node:path";
import process, { env } from "node:process";
import { parseEnv } from "node:util";
import { blue, underline } from "ansis";
import { createDefu } from "defu";
import { createDebug } from "obug";
import { glob, isDynamicPattern } from "tinyglobby";
const picomatch = __cjs_require("picomatch");
import { RE_CSS, RE_DTS } from "rolldown-plugin-dts/filename";
import { readFileSync, writeFileSync } from "node:fs";
const minVersion = __cjs_require("semver/ranges/min-version.js");
import { up } from "empathic/find";
import { up as up$1 } from "empathic/package";
import { pathToFileURL } from "node:url";
import { init, isSupported } from "import-without-cache";
import { createConfigCoreLoader } from "unconfig-core";

//#region node_modules/.pnpm/is-in-ci@2.0.0/node_modules/is-in-ci/index.js
const check = (key) => key in env && env[key] !== "0" && env[key] !== "false";
const isInCi = check("CI") || check("CONTINUOUS_INTEGRATION");
var is_in_ci_default = isInCi;

//#endregion
//#region src/utils/fs.ts
function fsExists(path$1) {
	return access(path$1).then(() => true, () => false);
}
function fsStat(path$1) {
	return stat(path$1).catch(() => null);
}
function fsRemove(path$1) {
	return rm(path$1, {
		force: true,
		recursive: true
	}).catch(() => {});
}
function fsCopy(from, to) {
	return cp(from, to, {
		recursive: true,
		force: true
	});
}
function lowestCommonAncestor(...filepaths) {
	if (filepaths.length === 0) return "";
	if (filepaths.length === 1) return dirname(filepaths[0]);
	filepaths = filepaths.map(normalize);
	const [first, ...rest] = filepaths;
	let ancestor = first.split(sep);
	for (const filepath of rest) {
		const directories = filepath.split(sep, ancestor.length);
		let index = 0;
		for (const directory of directories) if (directory === ancestor[index]) index += 1;
		else {
			ancestor = ancestor.slice(0, index);
			break;
		}
		ancestor = ancestor.slice(0, index);
	}
	return ancestor.length <= 1 && ancestor[0] === "" ? sep + ancestor[0] : ancestor.join(sep);
}
function stripExtname(filePath) {
	const ext = extname(filePath);
	if (!ext.length) return filePath;
	return filePath.slice(0, -ext.length);
}

//#endregion
//#region src/features/clean.ts
const debug$2 = createDebug("tsdown:clean");
const RE_LAST_SLASH = /[/\\]$/;
async function cleanOutDir(configs) {
	const removes = /* @__PURE__ */ new Set();
	for (const config of configs) {
		if (config.debug && (config.debug.clean ?? true)) config.clean.push(".rolldown");
		if (!config.clean.length) continue;
		const files = await glob(config.clean, {
			cwd: config.cwd,
			absolute: true,
			onlyFiles: false,
			dot: true
		});
		const normalizedOutDir = config.outDir.replace(RE_LAST_SLASH, "");
		for (const file of files) if (file.replace(RE_LAST_SLASH, "") !== normalizedOutDir) removes.add(file);
	}
	if (!removes.size) return;
	globalLogger.info(`Cleaning ${removes.size} files`);
	await Promise.all([...removes].map(async (file) => {
		debug$2("Removing", file);
		await fsRemove(file);
	}));
	debug$2("Removed %d files", removes.size);
}
function resolveClean(clean, outDir, cwd) {
	if (clean === true) clean = [slash(outDir)];
	else if (!clean) clean = [];
	if (clean.some((item) => path.resolve(item) === cwd)) throw new Error("Cannot clean the current working directory. Please specify a different path to clean option.");
	return clean;
}
async function cleanChunks(outDir, chunks) {
	await Promise.all(chunks.map(async (chunk) => {
		const filePath = path.resolve(outDir, chunk.fileName);
		debug$2("Removing chunk file", filePath);
		await fsRemove(filePath);
	}));
}

//#endregion
//#region src/features/css.ts
const RE_CSS_HASH = /-[\w-]+\.css$/;
const RE_CHUNK_HASH = /-[\w-]+\.(m?js|cjs)$/;
const RE_CHUNK_EXT = /\.(m?js|cjs)$/;
const defaultCssBundleName = "style.css";
/**
* Normalize CSS file name by removing hash pattern and extension.
* e.g., "async-DcjEOEdU.css" -> "async"
*/
function normalizeCssFileName(cssFileName) {
	return cssFileName.replace(RE_CSS_HASH, "").replace(RE_CSS, "");
}
/**
* Normalize chunk file name by removing hash pattern and extension.
* e.g., "async-CvIfFAic.mjs" -> "async"
*/
function normalizeChunkFileName(chunkFileName) {
	return chunkFileName.replace(RE_CHUNK_HASH, "").replace(RE_CHUNK_EXT, "");
}
/**
* CSS Code Split Plugin
*
* When css.splitting is false, this plugin merges all CSS files into a single file.
* When css.splitting is true (default), CSS code splitting is preserved.
* Based on Vite's implementation.
*/
function CssCodeSplitPlugin(config) {
	const { splitting, fileName } = config.css;
	if (splitting) return;
	let hasEmitted = false;
	return {
		name: "tsdown:css-code-split",
		renderStart() {
			hasEmitted = false;
		},
		generateBundle(_outputOptions, bundle) {
			if (hasEmitted) return;
			const cssAssets = /* @__PURE__ */ new Map();
			for (const [fileName$1, asset] of Object.entries(bundle)) if (asset.type === "asset" && RE_CSS.test(fileName$1)) {
				const source = typeof asset.source === "string" ? asset.source : new TextDecoder("utf-8").decode(asset.source);
				cssAssets.set(fileName$1, source);
			}
			if (!cssAssets.size) return;
			const chunkCSSMap = /* @__PURE__ */ new Map();
			for (const [chunkFileName, item] of Object.entries(bundle)) if (item.type === "chunk") {
				for (const moduleId of Object.keys(item.modules)) if (RE_CSS.test(moduleId)) {
					if (!chunkCSSMap.has(chunkFileName)) chunkCSSMap.set(chunkFileName, []);
					break;
				}
			}
			for (const [cssFileName] of cssAssets) {
				const cssBaseName = normalizeCssFileName(cssFileName);
				for (const [chunkFileName] of chunkCSSMap) if (normalizeChunkFileName(chunkFileName) === cssBaseName || chunkFileName.startsWith(`${cssBaseName}-`)) {
					chunkCSSMap.get(chunkFileName)?.push(cssFileName);
					break;
				}
			}
			let extractedCss = "";
			const collected = /* @__PURE__ */ new Set();
			const dynamicImports = /* @__PURE__ */ new Set();
			function collect(chunk) {
				if (!chunk || chunk.type !== "chunk" || collected.has(chunk)) return;
				collected.add(chunk);
				chunk.imports.forEach((importName) => {
					collect(bundle[importName]);
				});
				chunk.dynamicImports.forEach((importName) => {
					dynamicImports.add(importName);
				});
				const files = chunkCSSMap.get(chunk.fileName);
				if (files && files.length > 0) for (const filename of files) extractedCss += cssAssets.get(filename) ?? "";
			}
			for (const chunk of Object.values(bundle)) if (chunk.type === "chunk" && chunk.isEntry) collect(chunk);
			for (const chunkName of dynamicImports) collect(bundle[chunkName]);
			if (extractedCss) {
				hasEmitted = true;
				for (const fileName$1 of cssAssets.keys()) delete bundle[fileName$1];
				this.emitFile({
					type: "asset",
					source: extractedCss,
					fileName,
					originalFileName: defaultCssBundleName
				});
			}
		}
	};
}

//#endregion
//#region src/features/entry.ts
async function resolveEntry(logger, entry, cwd, color, nameLabel) {
	if (!entry || Object.keys(entry).length === 0) {
		const defaultEntry = path.resolve(cwd, "src/index.ts");
		if (await fsExists(defaultEntry)) entry = { index: defaultEntry };
		else throw new Error(`${nameLabel} No input files, try "tsdown <your-file>" or create src/index.ts`);
	}
	const entryMap = await toObjectEntry(entry, cwd);
	const entries = Object.values(entryMap);
	if (entries.length === 0) throw new Error(`${nameLabel} Cannot find entry: ${JSON.stringify(entry)}`);
	logger.info(nameLabel, `entry: ${color(entries.map((entry$1) => path.relative(cwd, entry$1)).join(", "))}`);
	return entryMap;
}
async function toObjectEntry(entry, cwd) {
	if (typeof entry === "string") entry = [entry];
	if (!Array.isArray(entry)) return Object.fromEntries((await Promise.all(Object.entries(entry).map(async ([key, value]) => {
		if (!key.includes("*")) {
			if (Array.isArray(value)) throw new TypeError(`Object entry "${key}" cannot have an array value when the key is not a glob pattern.`);
			return [[key, value]];
		}
		const patterns = toArray(value);
		const files = await glob(patterns, {
			cwd,
			expandDirectories: false
		});
		if (!files.length) throw new Error(`Cannot find files for entry key "${key}" with patterns: ${JSON.stringify(patterns)}`);
		let valueGlobBase;
		for (const pattern of patterns) {
			if (pattern.startsWith("!")) continue;
			const base$1 = picomatch.scan(pattern).base;
			if (valueGlobBase === void 0) valueGlobBase = base$1;
			else if (valueGlobBase !== base$1) throw new Error(`When using object entry with glob pattern key "${key}", all value glob patterns must have the same base directory.`);
		}
		if (valueGlobBase === void 0) throw new Error(`Cannot determine base directory for value glob patterns of key "${key}".`);
		return files.map((file) => [slash(key.replaceAll("*", stripExtname(path.relative(valueGlobBase, file)))), path.resolve(cwd, file)]);
	}))).flat());
	const isGlob = entry.some((e) => isDynamicPattern(e));
	let resolvedEntry;
	if (isGlob) resolvedEntry = (await glob(entry, {
		cwd,
		expandDirectories: false,
		absolute: true
	})).map((file) => path.resolve(file));
	else resolvedEntry = entry;
	const base = lowestCommonAncestor(...resolvedEntry);
	return Object.fromEntries(resolvedEntry.map((file) => {
		return [slash(stripExtname(path.relative(base, file))), file];
	}));
}

//#endregion
//#region src/utils/format.ts
function formatBytes(bytes) {
	if (bytes === Infinity) return void 0;
	return `${(bytes / 1e3).toFixed(2)} kB`;
}
function detectIndentation(jsonText) {
	const lines = jsonText.split(/\r?\n/);
	for (const line of lines) {
		const match = line.match(/^(\s+)\S/);
		if (!match) continue;
		if (match[1].includes("	")) return "	";
		return match[1].length;
	}
	return 2;
}

//#endregion
//#region src/features/pkg/exports.ts
async function writeExports(options, chunks) {
	const pkg = options.pkg;
	const exports = options.exports;
	const { publishExports, ...generated } = await generateExports(pkg, chunks, exports, options.logger);
	const updatedPkg = {
		...pkg,
		...generated,
		packageJsonPath: void 0
	};
	if (publishExports) {
		updatedPkg.publishConfig ||= {};
		updatedPkg.publishConfig.exports = publishExports;
	}
	const original = readFileSync(pkg.packageJsonPath, "utf8");
	let contents = JSON.stringify(updatedPkg, null, detectIndentation(original));
	if (original.endsWith("\n")) contents += "\n";
	if (contents !== original) writeFileSync(pkg.packageJsonPath, contents, "utf8");
}
function shouldExclude(fileName, exclude) {
	if (!exclude?.length) return false;
	return matchPattern(fileName, exclude);
}
async function generateExports(pkg, chunks, { devExports, all, packageJson = true, exclude, customExports }, logger) {
	const pkgRoot = path.dirname(pkg.packageJsonPath);
	let main, module, cjsTypes, esmTypes;
	const exportsMap = /* @__PURE__ */ new Map();
	const formats = Object.keys(chunks);
	if (!formats.includes("cjs") && !formats.includes("es")) logger.warn(`No CJS or ESM formats found in chunks for package ${pkg.name}`);
	for (const [format, chunksByFormat] of Object.entries(chunks)) {
		if (format !== "es" && format !== "cjs") continue;
		const filteredChunks = chunksByFormat.filter((chunk) => chunk.type === "chunk" && chunk.isEntry && !shouldExclude(chunk.fileName, exclude));
		const onlyOneEntry = filteredChunks.filter((chunk) => !RE_DTS.test(chunk.fileName)).length === 1;
		for (const chunk of filteredChunks) {
			const normalizedName = slash(chunk.fileName);
			let name = stripExtname(normalizedName);
			const isDts = name.endsWith(".d");
			if (isDts) name = name.slice(0, -2);
			const isIndex = onlyOneEntry || name === "index";
			const outDirRelative = slash(path.relative(pkgRoot, chunk.outDir));
			const distFile = `${outDirRelative ? `./${outDirRelative}` : "."}/${normalizedName}`;
			if (isIndex) {
				name = ".";
				if (format === "cjs") if (isDts) cjsTypes = distFile;
				else main = distFile;
				else if (format === "es") if (isDts) esmTypes = distFile;
				else module = distFile;
			} else if (name.endsWith("/index")) name = `./${name.slice(0, -6)}`;
			else name = `./${name}`;
			let subExport = exportsMap.get(name);
			if (!subExport) {
				subExport = {};
				exportsMap.set(name, subExport);
			}
			if (!isDts) {
				subExport[format] = distFile;
				if (chunk.facadeModuleId && !subExport.src) subExport.src = `./${slash(path.relative(pkgRoot, chunk.facadeModuleId))}`;
			}
		}
	}
	const sortedExportsMap = Array.from(exportsMap.entries()).toSorted(([a], [b]) => {
		if (a === "index") return -1;
		return a.localeCompare(b);
	});
	let exports = Object.fromEntries(sortedExportsMap.map(([name, subExport]) => [name, genSubExport(devExports, subExport)]));
	exportMeta(exports, all, packageJson);
	if (customExports) exports = await customExports(exports, {
		pkg,
		chunks,
		isPublish: false
	});
	let publishExports;
	if (devExports) {
		publishExports = Object.fromEntries(sortedExportsMap.map(([name, subExport]) => [name, genSubExport(false, subExport)]));
		exportMeta(publishExports, all, packageJson);
		if (customExports) publishExports = await customExports(publishExports, {
			pkg,
			chunks,
			isPublish: true
		});
	}
	return {
		main: main || module || pkg.main,
		module: module || pkg.module,
		types: cjsTypes || esmTypes || pkg.types,
		exports,
		publishExports
	};
}
function genSubExport(devExports, { src, es, cjs }) {
	if (devExports === true) return src;
	let value;
	const dualFormat = es && cjs;
	if (!dualFormat && !devExports) value = cjs || es;
	else {
		value = {};
		if (typeof devExports === "string") value[devExports] = src;
		if (cjs) value[dualFormat ? "require" : "default"] = cjs;
		if (es) value[dualFormat ? "import" : "default"] = es;
	}
	return value;
}
function exportMeta(exports, all, packageJson) {
	if (all) exports["./*"] = "./*";
	else if (packageJson) exports["./package.json"] = "./package.json";
}
function hasExportsTypes(pkg) {
	const exports = pkg?.exports;
	if (!exports) return false;
	if (typeof exports === "object" && exports !== null && !Array.isArray(exports)) {
		if ("types" in exports) return true;
		if ("." in exports) {
			const mainExport = exports["."];
			if (typeof mainExport === "object" && mainExport !== null && "types" in mainExport) return true;
		}
	}
	return false;
}

//#endregion
//#region src/features/target.ts
function resolveTarget(logger, target, color, pkg, nameLabel) {
	if (target === false) return;
	if (target == null) {
		const pkgTarget = resolvePackageTarget(pkg);
		if (pkgTarget) target = pkgTarget;
		else return;
	}
	if (typeof target === "number") throw new TypeError(`Invalid target: ${target}`);
	const targets = resolveComma(toArray(target));
	if (targets.length) logger.info(nameLabel, `target${targets.length > 1 ? "s" : ""}: ${color(targets.join(", "))}`);
	return targets;
}
function resolvePackageTarget(pkg) {
	const nodeVersion = pkg?.engines?.node;
	if (!nodeVersion) return;
	const nodeMinVersion = minVersion(nodeVersion);
	if (!nodeMinVersion) return;
	if (nodeMinVersion.version === "0.0.0") return;
	return `node${nodeMinVersion.version}`;
}

//#endregion
//#region src/features/tsconfig.ts
function findTsconfig(cwd, name = "tsconfig.json") {
	return up(name, { cwd }) || false;
}
async function resolveTsconfig(logger, tsconfig, cwd, color, nameLabel) {
	const original = tsconfig;
	if (tsconfig !== false) {
		if (tsconfig === true || tsconfig == null) {
			tsconfig = findTsconfig(cwd);
			if (original && !tsconfig) logger.warn(`No tsconfig found in ${blue(cwd)}`);
		} else {
			const tsconfigPath = path.resolve(cwd, tsconfig);
			const stat$1 = await fsStat(tsconfigPath);
			if (stat$1?.isFile()) tsconfig = tsconfigPath;
			else if (stat$1?.isDirectory()) {
				tsconfig = findTsconfig(tsconfigPath);
				if (!tsconfig) logger.warn(`No tsconfig found in ${blue(tsconfigPath)}`);
			} else {
				tsconfig = findTsconfig(cwd, tsconfig);
				if (!tsconfig) logger.warn(`tsconfig ${blue(original)} doesn't exist`);
			}
		}
		if (tsconfig) logger.info(nameLabel, `tsconfig: ${color(path.relative(cwd, tsconfig))}`);
	}
	return tsconfig;
}

//#endregion
//#region src/utils/package.ts
const debug$1 = createDebug("tsdown:package");
async function readPackageJson(dir) {
	const packageJsonPath = up$1({ cwd: dir });
	if (!packageJsonPath) return;
	debug$1("Reading package.json:", packageJsonPath);
	const contents = await readFile(packageJsonPath, "utf8");
	return {
		...JSON.parse(contents),
		packageJsonPath
	};
}
function getPackageType(pkg) {
	if (pkg?.type) {
		if (!["module", "commonjs"].includes(pkg.type)) throw new Error(`Invalid package.json type: ${pkg.type}`);
		return pkg.type;
	}
}
function normalizeFormat(format) {
	switch (format) {
		case "es":
		case "esm":
		case "module": return "es";
		case "cjs":
		case "commonjs": return "cjs";
		default: return format;
	}
}

//#endregion
//#region src/config/file.ts
const debug = createDebug("tsdown:config:file");
async function loadViteConfig(prefix, cwd, configLoader) {
	const loader = resolveConfigLoader(configLoader);
	debug("Loading Vite config via loader: ", loader);
	const parser = createParser(loader);
	const [result] = await createConfigCoreLoader({
		sources: [{
			files: [`${prefix}.config`],
			extensions: [
				"js",
				"mjs",
				"ts",
				"cjs",
				"mts",
				"mts"
			],
			parser
		}],
		cwd
	}).load(true);
	if (!result) return;
	const { config, source } = result;
	globalLogger.info(`Using Vite config: ${underline(source)}`);
	const resolved = await config;
	if (typeof resolved === "function") return resolved({
		command: "build",
		mode: "production"
	});
	return resolved;
}
const configPrefix = "tsdown.config";
async function loadConfigFile(inlineConfig, workspace) {
	let cwd = inlineConfig.cwd || process.cwd();
	let overrideConfig = false;
	let { config: filePath } = inlineConfig;
	if (filePath === false) return { configs: [{}] };
	if (typeof filePath === "string") {
		const stats = await fsStat(filePath);
		if (stats) {
			const resolved = path.resolve(filePath);
			if (stats.isFile()) {
				overrideConfig = true;
				filePath = resolved;
				cwd = path.dirname(filePath);
			} else if (stats.isDirectory()) cwd = resolved;
		}
	}
	const loader = resolveConfigLoader(inlineConfig.configLoader);
	debug("Using config loader:", loader);
	const parser = createParser(loader);
	const [result] = await createConfigCoreLoader({
		sources: overrideConfig ? [{
			files: [filePath],
			extensions: [],
			parser
		}] : [{
			files: [configPrefix],
			extensions: [
				"ts",
				"mts",
				"cts",
				"js",
				"mjs",
				"cjs",
				"json"
			],
			parser
		}, {
			files: ["package.json"],
			parser
		}],
		cwd,
		stopAt: workspace && path.dirname(workspace)
	}).load(true);
	let exported = [];
	let file;
	if (result) {
		({config: exported, source: file} = result);
		globalLogger.info(`config file: ${underline(file)}`, loader === "native" ? "" : `(${loader})`);
		exported = await exported;
		if (typeof exported === "function") exported = await exported(inlineConfig, { ci: is_in_ci_default });
	}
	exported = toArray(exported);
	if (exported.length === 0) exported.push({});
	if (exported.some((config) => typeof config === "function")) throw new Error("Function should not be nested within multiple tsdown configurations. It must be at the top level.\nExample: export default defineConfig(() => [...])");
	return {
		configs: exported.map((config) => ({
			...config,
			cwd: config.cwd ? path.resolve(cwd, config.cwd) : cwd
		})),
		file
	};
}
const isBun = !!process.versions.bun;
const nativeTS = process.features.typescript || process.versions.deno;
const autoLoader = isBun || nativeTS && isSupported ? "native" : "unrun";
function resolveConfigLoader(configLoader = "auto") {
	if (configLoader === "auto") return autoLoader;
	else return configLoader === "native" ? "native" : "unrun";
}
function createParser(loader) {
	return async (filepath) => {
		const basename = path.basename(filepath);
		const isPkgJson = basename === "package.json";
		if (basename === configPrefix || isPkgJson || basename.endsWith(".json")) {
			const contents = await readFile(filepath, "utf8");
			const parsed = JSON.parse(contents);
			if (isPkgJson) return parsed?.tsdown;
			return parsed;
		}
		if (loader === "native") return nativeImport(filepath);
		return unrunImport(filepath);
	};
}
async function nativeImport(id) {
	const url = pathToFileURL(id);
	const importAttributes = Object.create(null);
	if (isSupported) {
		importAttributes.cache = "no";
		init({ skipNodeModules: true });
	} else if (!isBun) url.searchParams.set("no-cache", crypto.randomUUID());
	const mod = await import(url.href, { with: importAttributes }).catch((error) => {
		if (error?.message?.includes?.("Cannot find module")) throw new Error(`Failed to load the config file. Try setting the --config-loader CLI flag to \`unrun\`.\n\n${error.message}`, { cause: error });
		else throw error;
	});
	return mod.default || mod;
}
async function unrunImport(id) {
	const { unrun } = await import("unrun");
	const { module } = await unrun({ path: pathToFileURL(id).href });
	return module;
}

//#endregion
//#region src/config/options.ts
const debugLog = createDebug("tsdown:config:options");
async function resolveUserConfig(userConfig, inlineConfig) {
	let { entry, format = ["es"], plugins = [], clean = true, silent = false, logLevel = silent ? "silent" : "info", failOnWarn = "ci-only", customLogger, treeshake = true, platform = "node", outDir = "dist", sourcemap = false, dts, unused = false, watch = false, ignoreWatch, shims = false, skipNodeModulesBundle = false, publint = false, attw = false, fromVite, alias, tsconfig, report = true, target, env: env$1 = {}, envFile, envPrefix = "TSDOWN_", copy, publicDir, hash = true, cwd = process.cwd(), name, workspace, external, noExternal, exports = false, bundle, unbundle = typeof bundle === "boolean" ? !bundle : false, removeNodeProtocol, nodeProtocol, cjsDefault = true, globImport = true, inlineOnly, css, fixedExtension = platform === "node", debug: debug$3 = false, write = true } = userConfig;
	const pkg = await readPackageJson(cwd);
	if (workspace) name ||= pkg?.name;
	const color = generateColor(name);
	const nameLabel = getNameLabel(color, name);
	if (!filterConfig(inlineConfig.filter, cwd, name)) {
		debugLog("[filter] skipping config %s", cwd);
		return [];
	}
	const logger = createLogger(logLevel, {
		customLogger,
		failOnWarn: resolveFeatureOption(failOnWarn, true)
	});
	if (typeof bundle === "boolean") logger.warn("`bundle` option is deprecated. Use `unbundle` instead.");
	if (removeNodeProtocol) {
		if (nodeProtocol) throw new TypeError("`removeNodeProtocol` is deprecated. Please only use `nodeProtocol` instead.");
		logger.warn("`removeNodeProtocol` is deprecated. Use `nodeProtocol: \"strip\"` instead.");
	}
	nodeProtocol = nodeProtocol ?? (removeNodeProtocol ? "strip" : false);
	outDir = path.resolve(cwd, outDir);
	clean = resolveClean(clean, outDir, cwd);
	const resolvedEntry = await resolveEntry(logger, entry, cwd, color, nameLabel);
	if (dts == null) dts = !!(pkg?.types || pkg?.typings || hasExportsTypes(pkg));
	target = resolveTarget(logger, target, color, pkg, nameLabel);
	tsconfig = await resolveTsconfig(logger, tsconfig, cwd, color, nameLabel);
	if (typeof external === "string") external = resolveRegex(external);
	if (typeof noExternal === "string") noExternal = resolveRegex(noExternal);
	publint = resolveFeatureOption(publint, {});
	attw = resolveFeatureOption(attw, {});
	exports = resolveFeatureOption(exports, {});
	unused = resolveFeatureOption(unused, {});
	report = resolveFeatureOption(report, {});
	dts = resolveFeatureOption(dts, {});
	if (!pkg) {
		if (exports) throw new Error("`package.json` not found, cannot write exports");
		if (publint) logger.warn(nameLabel, "publint is enabled but package.json is not found");
		if (attw) logger.warn(nameLabel, "attw is enabled but package.json is not found");
	}
	if (publicDir) if (copy) throw new TypeError("`publicDir` is deprecated. Cannot be used with `copy`");
	else logger.warn(`${blue`publicDir`} is deprecated. Use ${blue`copy`} instead.`);
	envPrefix = toArray(envPrefix);
	if (envPrefix.includes("")) logger.warn("`envPrefix` includes an empty string; filtering is disabled. All environment variables from the env file and process.env will be injected into the build. Ensure this is intended to avoid accidental leakage of sensitive information.");
	const envFromProcess = filterEnv(process.env, envPrefix);
	if (envFile) {
		const resolvedPath = path.resolve(cwd, envFile);
		logger.info(nameLabel, `env file: ${color(resolvedPath)}`);
		env$1 = {
			...filterEnv(parseEnv(await readFile(resolvedPath, "utf8")), envPrefix),
			...envFromProcess,
			...env$1
		};
	} else env$1 = {
		...envFromProcess,
		...env$1
	};
	debugLog(`Environment variables: %O`, env$1);
	if (fromVite) {
		const viteUserConfig = await loadViteConfig(fromVite === true ? "vite" : fromVite, cwd, inlineConfig.configLoader);
		if (viteUserConfig) {
			const viteAlias = viteUserConfig.resolve?.alias;
			if (Array.isArray(viteAlias)) throw new TypeError("Unsupported resolve.alias in Vite config. Use object instead of array");
			if (viteAlias) alias = {
				...alias,
				...viteAlias
			};
			if (viteUserConfig.plugins) plugins = [viteUserConfig.plugins, plugins];
		}
	}
	ignoreWatch = toArray(ignoreWatch).map((ignore) => {
		ignore = resolveRegex(ignore);
		if (typeof ignore === "string") return path.resolve(cwd, ignore);
		return ignore;
	});
	if (noExternal != null && typeof noExternal !== "function") {
		const noExternalPatterns = toArray(noExternal);
		noExternal = (id) => matchPattern(id, noExternalPatterns);
	}
	if (inlineOnly != null) inlineOnly = toArray(inlineOnly);
	debug$3 = resolveFeatureOption(debug$3, {});
	if (debug$3) if (watch) {
		if (debug$3.devtools) logger.warn("Devtools is not supported in watch mode, disabling it.");
		debug$3.devtools = false;
	} else debug$3.devtools ??= !!pkgExists("@vitejs/devtools/cli");
	const config = {
		...userConfig,
		alias,
		attw,
		cjsDefault,
		clean,
		copy: publicDir || copy,
		css: {
			splitting: true,
			fileName: defaultCssBundleName,
			...css
		},
		cwd,
		debug: debug$3,
		dts,
		entry: resolvedEntry,
		env: env$1,
		exports,
		external,
		fixedExtension,
		globImport,
		hash,
		ignoreWatch,
		inlineOnly,
		logger,
		name,
		nameLabel,
		nodeProtocol,
		noExternal,
		outDir,
		pkg,
		platform,
		plugins,
		publint,
		report,
		shims,
		skipNodeModulesBundle,
		sourcemap,
		target,
		treeshake,
		tsconfig,
		unbundle,
		unused,
		watch,
		write
	};
	const objectFormat = typeof format === "object" && !Array.isArray(format);
	return (objectFormat ? Object.keys(format) : resolveComma(toArray(format, "es"))).map((fmt, idx) => {
		const once = idx === 0;
		const overrides = objectFormat ? format[fmt] : void 0;
		return {
			...config,
			copy: once ? config.copy : void 0,
			onSuccess: once ? config.onSuccess : void 0,
			format: normalizeFormat(fmt),
			...overrides
		};
	});
}
/** filter env variables by prefixes */
function filterEnv(envDict, envPrefixes) {
	const env$1 = {};
	for (const [key, value] of Object.entries(envDict)) if (envPrefixes.some((prefix) => key.startsWith(prefix)) && value !== void 0) env$1[key] = value;
	return env$1;
}
const defu = createDefu((obj, key, value) => {
	if (Array.isArray(obj[key]) && Array.isArray(value)) {
		obj[key] = value;
		return true;
	}
});
function mergeConfig(defaults, overrides) {
	return defu(overrides, defaults);
}
async function mergeUserOptions(defaults, user, args) {
	const userOutputOptions = typeof user === "function" ? await user(defaults, ...args) : user;
	if (!userOutputOptions) return defaults;
	return defu(userOutputOptions, defaults);
}
function resolveFeatureOption(value, defaults) {
	if (typeof value === "object" && value !== null) return resolveCIOption(value.enabled ?? true) ? value : false;
	return resolveCIOption(value) ? defaults : false;
}
function resolveCIOption(value) {
	if (value === "ci-only") return is_in_ci_default ? true : false;
	if (value === "local-only") return is_in_ci_default ? false : true;
	return value;
}
function filterConfig(filter, configCwd, name) {
	if (!filter) return true;
	let cwd = path.relative(process.cwd(), configCwd);
	if (cwd === "") cwd = ".";
	if (filter instanceof RegExp) return name && filter.test(name) || filter.test(cwd);
	return toArray(filter).some((value) => name && name === value || cwd === value);
}

//#endregion
//#region src/config.ts
function defineConfig(options) {
	return options;
}

//#endregion
export { loadConfigFile as a, formatBytes as c, cleanOutDir as d, fsCopy as f, lowestCommonAncestor as h, resolveUserConfig as i, CssCodeSplitPlugin as l, fsRemove as m, mergeConfig as n, getPackageType as o, fsExists as p, mergeUserOptions as r, writeExports as s, defineConfig as t, cleanChunks as u };