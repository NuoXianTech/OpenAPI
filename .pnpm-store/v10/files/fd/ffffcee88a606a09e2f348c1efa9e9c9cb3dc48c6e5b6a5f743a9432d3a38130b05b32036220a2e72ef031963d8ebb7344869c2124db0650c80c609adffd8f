import { createRequire as __cjs_createRequire } from "node:module";
const __cjs_require = __cjs_createRequire(import.meta.url);
import { a as globalLogger, c as matchPattern, d as promiseWithResolvers, f as resolveComma, h as toArray, l as noop, m as slash, o as prettyFormat, s as importWithError, t as LogLevels } from "./logger-s1ImI5j1.mjs";
import { a as loadConfigFile, c as formatBytes, d as cleanOutDir, f as fsCopy, h as lowestCommonAncestor, i as resolveUserConfig, l as CssCodeSplitPlugin, m as fsRemove, o as getPackageType, p as fsExists, r as mergeUserOptions, s as writeExports, u as cleanChunks } from "./config-DlCfPR2i.mjs";
import { t as version } from "./package-BZkqghxy.mjs";
import { builtinModules, isBuiltin } from "node:module";
import { chmod, mkdtemp, readFile, writeFile } from "node:fs/promises";
import path, { join } from "node:path";
import process from "node:process";
import util, { formatWithOptions, promisify } from "node:util";
import { blue, bold, dim, green, underline } from "ansis";
import { createDebug } from "obug";
import { glob, isDynamicPattern } from "tinyglobby";
import { RE_CSS, RE_DTS, RE_JS, RE_NODE_MODULES } from "rolldown-plugin-dts/filename";
import { fileURLToPath } from "node:url";
import { clearRequireCache } from "import-without-cache";
import * as Rolldown from "rolldown";
import { VERSION, build, watch } from "rolldown";
const coerce = __cjs_require("semver/functions/coerce.js");
const satisfies = __cjs_require("semver/functions/satisfies.js");
import { Hookable } from "hookable";
import { exec } from "tinyexec";
const treeKill = __cjs_require("tree-kill");
import { tmpdir } from "node:os";
import { importGlobPlugin } from "rolldown/experimental";
import { Buffer } from "node:buffer";
import { brotliCompress, gzip } from "node:zlib";
import readline from "node:readline";

//#region src/config/workspace.ts
const debug$6 = createDebug("tsdown:config:workspace");
const DEFAULT_EXCLUDE_WORKSPACE = [
	"**/node_modules/**",
	"**/dist/**",
	"**/test?(s)/**",
	"**/t?(e)mp/**"
];
async function resolveWorkspace(config, inlineConfig) {
	const normalized = {
		...config,
		...inlineConfig
	};
	const rootCwd = normalized.cwd || process.cwd();
	let { workspace } = normalized;
	if (!workspace) return {
		configs: [normalized],
		files: []
	};
	if (workspace === true) workspace = {};
	else if (typeof workspace === "string" || Array.isArray(workspace)) workspace = { include: workspace };
	let { include: packages = "auto", exclude = DEFAULT_EXCLUDE_WORKSPACE, config: workspaceConfig } = workspace;
	if (packages === "auto") packages = (await glob("**/package.json", {
		ignore: exclude,
		cwd: rootCwd,
		expandDirectories: false
	})).filter((file) => file !== "package.json").map((file) => slash(path.resolve(rootCwd, file, "..")));
	else packages = (await glob(packages, {
		ignore: exclude,
		cwd: rootCwd,
		onlyDirectories: true,
		absolute: true,
		expandDirectories: false
	})).map((file) => slash(path.resolve(file)));
	if (packages.length === 0) throw new Error("No workspace packages found, please check your config");
	const files = [];
	return {
		configs: (await Promise.all(packages.map(async (cwd) => {
			debug$6("loading workspace config %s", cwd);
			const { configs, file } = await loadConfigFile({
				...inlineConfig,
				config: workspaceConfig,
				cwd
			}, cwd);
			if (file) {
				debug$6("loaded workspace config file %s", file);
				files.push(file);
			} else debug$6("no workspace config file found in %s", cwd);
			return configs.map((config$1) => ({
				...normalized,
				...config$1
			}));
		}))).flat(),
		files
	};
}

//#endregion
//#region src/config/index.ts
const debug$5 = createDebug("tsdown:config");
async function resolveConfig(inlineConfig) {
	debug$5("inline config %O", inlineConfig);
	if (inlineConfig.cwd) inlineConfig.cwd = path.resolve(inlineConfig.cwd);
	const { configs: rootConfigs, file } = await loadConfigFile(inlineConfig);
	const files = [];
	if (file) {
		files.push(file);
		debug$5("loaded root user config file %s", file);
		debug$5("root user configs %O", rootConfigs);
	} else debug$5("no root user config file found");
	const configs = (await Promise.all(rootConfigs.map(async (rootConfig) => {
		const { configs: workspaceConfigs, files: workspaceFiles } = await resolveWorkspace(rootConfig, inlineConfig);
		debug$5("workspace configs %O", workspaceConfigs);
		if (workspaceFiles) files.push(...workspaceFiles);
		return (await Promise.all(workspaceConfigs.filter((config) => !config.workspace || config.entry).map((config) => resolveUserConfig(config, inlineConfig)))).flat().filter((config) => !!config);
	}))).flat();
	debug$5("resolved configs %O", configs);
	if (configs.length === 0) throw new Error("No valid configuration found.");
	return {
		configs,
		files
	};
}

//#endregion
//#region src/features/cjs.ts
/**
* If the config includes the `cjs` format and
* one of its target >= node 23.0.0 / 22.12.0,
* warn the user about the deprecation of CommonJS.
*/
function warnLegacyCJS(config) {
	if (!config.format.includes("cjs") || !config.target) return;
	if (config.target.some((t) => {
		const version$1 = coerce(t.split("node")[1]);
		return version$1 && satisfies(version$1, ">=23.0.0 || >=22.12.0");
	})) config.logger.warnOnce("We recommend using the ESM format instead of CommonJS.\nThe ESM format is compatible with modern platforms and runtimes, and most new libraries are now distributed only in ESM format.\nLearn more at https://nodejs.org/en/learn/modules/publishing-a-package#how-did-we-get-here");
}

//#endregion
//#region src/features/copy.ts
async function copy(options) {
	if (!options.copy) return;
	const copy$1 = typeof options.copy === "function" ? await options.copy(options) : options.copy;
	const resolved = (await Promise.all(toArray(copy$1).map(async (entry) => {
		if (typeof entry === "string") entry = { from: [entry] };
		let from = toArray(entry.from);
		if (from.some((f) => isDynamicPattern(f))) from = await glob(from, {
			cwd: options.cwd,
			onlyFiles: true,
			expandDirectories: false
		});
		return from.map((file) => resolveCopyEntry({
			...entry,
			from: file
		}));
	}))).flat();
	if (!resolved.length) {
		options.logger.warn(options.nameLabel, `No files matched for copying.`);
		return;
	}
	await Promise.all(resolved.map(({ from, to, verbose }) => {
		if (verbose) options.logger.info(options.nameLabel, `Copying files from ${path.relative(options.cwd, from)} to ${path.relative(options.cwd, to)}`);
		return fsCopy(from, to);
	}));
	function resolveCopyEntry(entry) {
		const { flatten = true, rename } = entry;
		const from = path.resolve(options.cwd, entry.from);
		const to = entry.to ? path.resolve(options.cwd, entry.to) : options.outDir;
		const { base, dir } = path.parse(path.relative(options.cwd, from));
		const destFolder = flatten || !flatten && !dir ? to : dir.replace(dir.split(path.sep)[0], to);
		const dest = path.join(destFolder, rename ? renameTarget(base, rename, from) : base);
		return {
			...entry,
			from,
			to: dest
		};
	}
}
function renameTarget(target, rename, src) {
	const parsedPath = path.parse(target);
	return typeof rename === "string" ? rename : rename(parsedPath.name, parsedPath.ext.replace(".", ""), src);
}

//#endregion
//#region src/features/hooks.ts
async function createHooks(options) {
	const hooks = new Hookable();
	if (typeof options.hooks === "object") hooks.addHooks(options.hooks);
	else if (typeof options.hooks === "function") await options.hooks(hooks);
	return {
		hooks,
		context: {
			options,
			hooks
		}
	};
}
function executeOnSuccess(config) {
	if (!config.onSuccess) return;
	const ab = new AbortController();
	if (typeof config.onSuccess === "string") {
		const p = exec(config.onSuccess, [], { nodeOptions: {
			shell: true,
			stdio: "inherit"
		} });
		p.then(({ exitCode }) => {
			if (exitCode) process.exitCode = exitCode;
		});
		ab.signal.addEventListener("abort", () => {
			if (typeof p.pid === "number") treeKill(p.pid);
		});
	} else config.onSuccess(config, ab.signal);
	return ab;
}

//#endregion
//#region src/features/pkg/attw.ts
const debug$4 = createDebug("tsdown:attw");
const label$1 = dim`[attw]`;
const problemFlags = {
	NoResolution: "no-resolution",
	UntypedResolution: "untyped-resolution",
	FalseCJS: "false-cjs",
	FalseESM: "false-esm",
	CJSResolvesToESM: "cjs-resolves-to-esm",
	FallbackCondition: "fallback-condition",
	CJSOnlyExportsDefault: "cjs-only-exports-default",
	NamedExports: "named-exports",
	FalseExportDefault: "false-export-default",
	MissingExportEquals: "missing-export-equals",
	UnexpectedModuleSyntax: "unexpected-module-syntax",
	InternalResolutionError: "internal-resolution-error"
};
/**
* ATTW profiles.
* Defines the resolution modes to ignore for each profile.
*
* @see https://github.com/arethetypeswrong/arethetypeswrong.github.io/blob/main/packages/cli/README.md#profiles
*/
const profiles = {
	strict: [],
	node16: ["node10"],
	"esm-only": ["node10", "node16-cjs"]
};
async function attw(options) {
	if (!options.attw) return;
	if (!options.pkg) {
		options.logger.warn("attw is enabled but package.json is not found");
		return;
	}
	const { profile = "strict", level = "warn", ignoreRules = [], ...attwOptions } = options.attw;
	const invalidRules = ignoreRules.filter((rule) => !Object.values(problemFlags).includes(rule));
	if (invalidRules.length) options.logger.warn(`attw config option 'ignoreRules' contains invalid value '${invalidRules.join(", ")}'.`);
	const t = performance.now();
	debug$4("Running attw check");
	const tempDir = await mkdtemp(path.join(tmpdir(), "tsdown-attw-"));
	const attwCore = await importWithError("@arethetypeswrong/core", options.attw.resolvePaths);
	let checkResult;
	try {
		const { stdout: tarballInfo } = await exec("npm", [
			"pack",
			"--json",
			"--pack-destination",
			tempDir
		], { nodeOptions: { cwd: options.cwd } });
		const parsed = JSON.parse(tarballInfo);
		if (!Array.isArray(parsed) || !parsed[0]?.filename) throw new Error("Invalid npm pack output format");
		const tarball = await readFile(path.join(tempDir, parsed[0].filename));
		const pkg = attwCore.createPackageFromTarballData(tarball);
		checkResult = await attwCore.checkPackage(pkg, attwOptions);
	} catch (error) {
		options.logger.error("ATTW check failed:", error);
		return;
	} finally {
		await fsRemove(tempDir);
	}
	let errorMessage;
	if (checkResult.types) {
		const problems = checkResult.problems.filter((problem) => {
			if (ignoreRules.includes(problemFlags[problem.kind])) return false;
			if ("resolutionKind" in problem) return !profiles[profile]?.includes(problem.resolutionKind);
			return true;
		});
		if (problems.length) errorMessage = `problems found:\n${problems.map((problem) => formatProblem(checkResult.packageName, problem)).join("\n")}`;
	} else errorMessage = `Package has no types`;
	if (errorMessage) options.logger[level](options.nameLabel, label$1, errorMessage);
	else options.logger.success(options.nameLabel, label$1, "No problems found", dim`(${Math.round(performance.now() - t)}ms)`);
}
/**
* Format an ATTW problem for display
*/
function formatProblem(packageName, problem) {
	const resolutionKind = "resolutionKind" in problem ? ` (${problem.resolutionKind})` : "";
	const entrypoint = "entrypoint" in problem ? ` at ${slash(path.join(packageName, problem.entrypoint))}` : "";
	switch (problem.kind) {
		case "NoResolution": return `  ❌ No resolution${resolutionKind}${entrypoint}`;
		case "UntypedResolution": return `  ⚠️  Untyped resolution${resolutionKind}${entrypoint}`;
		case "FalseESM": return `  🔄 False ESM: Types indicate ESM (${problem.typesModuleKind}) but implementation is CJS (${problem.implementationModuleKind})\n     Types: ${problem.typesFileName} | Implementation: ${problem.implementationFileName}`;
		case "FalseCJS": return `  🔄 False CJS: Types indicate CJS (${problem.typesModuleKind}) but implementation is ESM (${problem.implementationModuleKind})\n     Types: ${problem.typesFileName} | Implementation: ${problem.implementationFileName}`;
		case "CJSResolvesToESM": return `  ⚡ CJS resolves to ESM${resolutionKind}${entrypoint}`;
		case "NamedExports": {
			const missingExports = problem.missing?.length > 0 ? ` Missing: ${problem.missing.join(", ")}` : "";
			return `  📤 Named exports problem${problem.isMissingAllNamed ? " (all named exports missing)" : ""}${missingExports}\n     Types: ${problem.typesFileName} | Implementation: ${problem.implementationFileName}`;
		}
		case "FallbackCondition": return `  🎯 Fallback condition used${resolutionKind}${entrypoint}`;
		case "FalseExportDefault": return `  🎭 False export default\n     Types: ${problem.typesFileName} | Implementation: ${problem.implementationFileName}`;
		case "MissingExportEquals": return `  📝 Missing export equals\n     Types: ${problem.typesFileName} | Implementation: ${problem.implementationFileName}`;
		case "InternalResolutionError": return `  💥 Internal resolution error in ${problem.fileName} (${problem.resolutionOption})\n     Module: ${problem.moduleSpecifier} | Mode: ${problem.resolutionMode}`;
		case "UnexpectedModuleSyntax": return `  📋 Unexpected module syntax in ${problem.fileName}\n     Expected: ${problem.moduleKind} | Found: ${problem.syntax === 99 ? "ESM" : "CJS"}`;
		case "CJSOnlyExportsDefault": return `  🏷️  CJS only exports default in ${problem.fileName}`;
		default: return `  ❓ Unknown problem: ${JSON.stringify(problem)}`;
	}
}

//#endregion
//#region src/features/pkg/publint.ts
const debug$3 = createDebug("tsdown:publint");
const label = dim`[publint]`;
async function publint(options) {
	if (!options.publint) return;
	if (!options.pkg) {
		options.logger.warn(options.nameLabel, "publint is enabled but package.json is not found");
		return;
	}
	const t = performance.now();
	debug$3("Running publint");
	const { publint: publint$1 } = await importWithError("publint", options.publint.resolvePaths);
	const { formatMessage } = await importWithError("publint/utils", options.publint.resolvePaths);
	const { messages } = await publint$1({
		...options.publint,
		pkgDir: path.dirname(options.pkg.packageJsonPath)
	});
	debug$3("Found %d issues", messages.length);
	if (!messages.length) {
		options.logger.success(options.nameLabel, label, "No issues found", dim`(${Math.round(performance.now() - t)}ms)`);
		return;
	}
	for (const message of messages) {
		const formattedMessage = formatMessage(message, options.pkg);
		const logType = {
			error: "error",
			warning: "warn",
			suggestion: "info"
		}[message.type];
		options.logger[logType](options.nameLabel, label, formattedMessage);
	}
}

//#endregion
//#region src/features/pkg/index.ts
function initBundleByPkg(configs) {
	const map = {};
	for (const config of configs) {
		const pkgJson = config.pkg?.packageJsonPath;
		if (!pkgJson) continue;
		if (!map[pkgJson]) {
			const { promise, resolve } = promiseWithResolvers();
			map[pkgJson] = {
				promise,
				resolve,
				count: 0,
				formats: /* @__PURE__ */ new Set(),
				bundles: []
			};
		}
		map[pkgJson].count++;
		map[pkgJson].formats.add(config.format);
	}
	return map;
}
async function bundleDone(bundleByPkg, bundle) {
	const pkg = bundle.config.pkg;
	if (!pkg) return;
	const ctx = bundleByPkg[pkg.packageJsonPath];
	ctx.bundles.push(bundle);
	if (ctx.bundles.length < ctx.count) return ctx.promise;
	const configs = ctx.bundles.map(({ config }) => config);
	const exportsConfigs = dedupeConfigs(configs, "exports");
	if (exportsConfigs.length) {
		if (exportsConfigs.length > 1) throw new Error(`Conflicting exports options for package at ${pkg.packageJsonPath}. Please merge them:\n${exportsConfigs.map((config) => `- ${formatWithOptions({ colors: true }, config.exports)}`).join("\n")}`);
		const chunks = {};
		for (const bundle$1 of ctx.bundles) {
			if (!bundle$1.config.exports) continue;
			chunks[bundle$1.config.format] ||= [];
			chunks[bundle$1.config.format].push(...bundle$1.chunks);
		}
		await writeExports(exportsConfigs[0], chunks);
	}
	const publintConfigs = dedupeConfigs(configs, "publint");
	const attwConfigs = dedupeConfigs(configs, "attw");
	if (publintConfigs.length > 1 || attwConfigs.length > 1) publintConfigs[1].logger.warn(`Multiple publint or attw configurations found for package at ${pkg.packageJsonPath}. Consider merging them for better consistency and performance.`);
	await Promise.all([...publintConfigs.map((config) => publint(config)), ...attwConfigs.map((config) => attw(config))]);
	ctx.resolve();
}
function dedupeConfigs(configs, key) {
	const filtered = configs.filter((config) => config[key]);
	if (!filtered.length) return [];
	const seen = /* @__PURE__ */ new Set();
	const results = filtered.filter((config) => {
		if (!Object.keys(config[key]).length) return false;
		if (seen.has(config[key])) return false;
		seen.add(config[key]);
		return true;
	});
	if (results.length === 0) return [filtered[0]];
	return results;
}

//#endregion
//#region src/features/external.ts
const debug$2 = createDebug("tsdown:external");
function ExternalPlugin({ pkg, noExternal, inlineOnly, skipNodeModulesBundle }) {
	const deps = pkg && Array.from(getProductionDeps(pkg));
	return {
		name: "tsdown:external",
		async resolveId(id, importer, extraOptions) {
			if (extraOptions.isEntry || !importer) return;
			const shouldExternal = await externalStrategy(this, id, importer, extraOptions);
			const nodeBuiltinModule = isBuiltin(id);
			debug$2("shouldExternal: %s = %s", id, shouldExternal);
			if (shouldExternal === true || shouldExternal === "absolute") return {
				id,
				external: shouldExternal,
				moduleSideEffects: nodeBuiltinModule ? false : void 0
			};
			if (inlineOnly && !RE_DTS.test(importer) && !nodeBuiltinModule && id[0] !== "." && !path.isAbsolute(id)) {
				const shouldInline = shouldExternal === "no-external" || matchPattern(id, inlineOnly);
				debug$2("shouldInline: %s = %s", id, shouldInline);
				if (shouldInline) return;
				const resolved = await this.resolve(id, importer, extraOptions);
				if (!resolved) return;
				if (RE_NODE_MODULES.test(resolved.id)) throw new Error(`${underline(id)} is located in node_modules but is not included in ${blue`inlineOnly`} option.
To fix this, either add it to ${blue`inlineOnly`}, declare it as a production or peer dependency in your package.json, or externalize it manually.
Imported by ${underline(importer)}`);
			}
		}
	};
	/**
	* - `true`: always external
	* - `false`: skip, let other plugins handle it
	* - `'absolute'`: external as absolute path
	* - `'no-external'`: skip, but mark as non-external for inlineOnly check
	*/
	async function externalStrategy(context, id, importer, extraOptions) {
		if (id === shimFile) return false;
		if (noExternal?.(id, importer)) return "no-external";
		if (skipNodeModulesBundle) {
			const resolved = await context.resolve(id, importer, extraOptions);
			if (resolved && (resolved.external || RE_NODE_MODULES.test(resolved.id))) return true;
		}
		if (deps && deps.some((dep) => id === dep || id.startsWith(`${dep}/`))) return true;
		return false;
	}
}
function getProductionDeps(pkg) {
	return new Set([...Object.keys(pkg.dependencies || {}), ...Object.keys(pkg.peerDependencies || {})]);
}

//#endregion
//#region src/utils/lightningcss.ts
/**
* Converts esbuild target [^1] (which is also used by Rolldown [^2]) to Lightning CSS targets [^3].
*
* [^1]: https://esbuild.github.io/api/#target
* [^2]: https://github.com/rolldown/rolldown/blob/v1.0.0-beta.8/packages/rolldown/src/binding.d.ts#L1429-L1431
* [^3]: https://lightningcss.dev/transpilation.html
*/
function esbuildTargetToLightningCSS(target) {
	let targets;
	const matches = [...target.join(" ").toLowerCase().matchAll(TARGET_REGEX)];
	for (const match of matches) {
		const browser = ESBUILD_LIGHTNINGCSS_MAPPING[match[1]];
		if (!browser) continue;
		const version$1 = match[2];
		const versionInt = parseVersion(version$1);
		if (versionInt == null) continue;
		targets = targets || {};
		targets[browser] = versionInt;
	}
	return targets;
}
const TARGET_REGEX = /([a-z]+)(\d+(?:\.\d+)*)/g;
const ESBUILD_LIGHTNINGCSS_MAPPING = {
	chrome: "chrome",
	edge: "edge",
	firefox: "firefox",
	ie: "ie",
	ios: "ios_saf",
	opera: "opera",
	safari: "safari"
};
function parseVersion(version$1) {
	const [major, minor = 0, patch = 0] = version$1.split("-")[0].split(".").map((v) => Number.parseInt(v, 10));
	if (Number.isNaN(major) || Number.isNaN(minor) || Number.isNaN(patch)) return null;
	return major << 16 | minor << 8 | patch;
}

//#endregion
//#region src/features/lightningcss.ts
async function LightningCSSPlugin(options) {
	const LightningCSS = await import("unplugin-lightningcss/rolldown").catch(() => void 0);
	if (!LightningCSS) return;
	const targets = options.target && esbuildTargetToLightningCSS(options.target);
	if (!targets) return;
	return LightningCSS.default({ options: { targets } });
}

//#endregion
//#region src/features/node-protocol.ts
const modulesWithoutProtocol = builtinModules.filter((mod) => !mod.startsWith("node:"));
/**
* The `node:` protocol was added in Node.js v14.18.0.
* @see https://nodejs.org/api/esm.html#node-imports
*/
function NodeProtocolPlugin(nodeProtocolOption) {
	if (nodeProtocolOption === "strip") return {
		name: "tsdown:node-protocol:strip",
		resolveId: {
			order: "pre",
			filter: { id: /* @__PURE__ */ new RegExp(`^node:(${modulesWithoutProtocol.join("|")})$`) },
			handler(id) {
				return {
					id: id.slice(5),
					external: true,
					moduleSideEffects: false
				};
			}
		}
	};
	return {
		name: "tsdown:node-protocol:add",
		resolveId: {
			order: "pre",
			filter: { id: /* @__PURE__ */ new RegExp(`^(${modulesWithoutProtocol.join("|")})$`) },
			handler(id) {
				return {
					id: `node:${id}`,
					external: true,
					moduleSideEffects: false
				};
			}
		}
	};
}

//#endregion
//#region src/features/output.ts
function resolveJsOutputExtension(packageType, format, fixedExtension) {
	switch (format) {
		case "es": return !fixedExtension && packageType === "module" ? "js" : "mjs";
		case "cjs": return fixedExtension || packageType === "module" ? "cjs" : "js";
		default: return "js";
	}
}
function resolveChunkFilename({ outExtensions, fixedExtension, pkg, hash }, inputOptions, format) {
	const packageType = getPackageType(pkg);
	let jsExtension;
	let dtsExtension;
	if (outExtensions) {
		const { js, dts } = outExtensions({
			options: inputOptions,
			format,
			pkgType: packageType
		}) || {};
		jsExtension = js;
		dtsExtension = dts;
	}
	jsExtension ??= `.${resolveJsOutputExtension(packageType, format, fixedExtension)}`;
	const suffix = format === "iife" || format === "umd" ? `.${format}` : "";
	return [createChunkFilename(`[name]${suffix}`, jsExtension, dtsExtension), createChunkFilename(`[name]${suffix}${hash ? "-[hash]" : ""}`, jsExtension, dtsExtension)];
}
function createChunkFilename(basename, jsExtension, dtsExtension) {
	if (dtsExtension === void 0) return `${basename}${jsExtension}`;
	return (chunk) => {
		return `${basename}${chunk.name.endsWith(".d") ? dtsExtension : jsExtension}`;
	};
}
function resolveChunkAddon(chunkAddon, format) {
	if (!chunkAddon) return;
	return (chunk) => {
		if (typeof chunkAddon === "function") chunkAddon = chunkAddon({
			format,
			fileName: chunk.fileName
		});
		if (typeof chunkAddon === "string") return chunkAddon;
		switch (true) {
			case RE_JS.test(chunk.fileName): return chunkAddon?.js || "";
			case RE_CSS.test(chunk.fileName): return chunkAddon?.css || "";
			case RE_DTS.test(chunk.fileName): return chunkAddon?.dts || "";
			default: return "";
		}
	};
}

//#endregion
//#region src/features/report.ts
const debug$1 = createDebug("tsdown:report");
const brotliCompressAsync = promisify(brotliCompress);
const gzipAsync = promisify(gzip);
const defaultOptions = {
	gzip: true,
	brotli: false,
	maxCompressSize: 1e6
};
function ReportPlugin(userOptions, logger, cwd, cjsDts, nameLabel, isDualFormat) {
	const options = {
		...defaultOptions,
		...userOptions
	};
	return {
		name: "tsdown:report",
		async writeBundle(outputOptions, bundle) {
			const outDir = path.relative(cwd, outputOptions.file ? path.resolve(cwd, outputOptions.file, "..") : path.resolve(cwd, outputOptions.dir));
			const sizes = [];
			for (const chunk of Object.values(bundle)) {
				const size = await calcSize(options, chunk);
				sizes.push(size);
			}
			const filenameLength = Math.max(...sizes.map((size) => size.filename.length));
			const rawTextLength = Math.max(...sizes.map((size) => size.rawText.length));
			const gzipTextLength = Math.max(...sizes.map((size) => size.gzipText == null ? 0 : size.gzipText.length));
			const brotliTextLength = Math.max(...sizes.map((size) => size.brotliText == null ? 0 : size.brotliText.length));
			let totalRaw = 0;
			for (const size of sizes) {
				size.rawText = size.rawText.padStart(rawTextLength);
				size.gzipText = size.gzipText?.padStart(gzipTextLength);
				size.brotliText = size.brotliText?.padStart(brotliTextLength);
				totalRaw += size.raw;
			}
			sizes.sort((a, b) => {
				if (a.dts !== b.dts) return a.dts ? 1 : -1;
				if (a.isEntry !== b.isEntry) return a.isEntry ? -1 : 1;
				return b.raw - a.raw;
			});
			const formatLabel = isDualFormat && prettyFormat(cjsDts ? "cjs" : outputOptions.format);
			for (const size of sizes) {
				const filenameColor = size.dts ? green : noop;
				logger.info(nameLabel, formatLabel, dim(outDir + path.sep) + filenameColor((size.isEntry ? bold : noop)(size.filename)), ` `.repeat(filenameLength - size.filename.length), dim(size.rawText), options.gzip && size.gzipText && dim`│ gzip: ${size.gzipText}`, options.brotli && size.brotliText && dim`│ brotli: ${size.brotliText}`);
			}
			const totalSizeText = formatBytes(totalRaw);
			logger.info(nameLabel, formatLabel, `${sizes.length} files, total: ${totalSizeText}`);
		}
	};
}
async function calcSize(options, chunk) {
	debug$1(`Calculating size for`, chunk.fileName);
	const content = chunk.type === "chunk" ? chunk.code : chunk.source;
	const raw = Buffer.byteLength(content, "utf8");
	debug$1("[size]", chunk.fileName, raw);
	let gzip$1 = Infinity;
	let brotli = Infinity;
	if (raw > options.maxCompressSize) debug$1(chunk.fileName, "file size exceeds limit, skip gzip/brotli");
	else {
		if (options.gzip) {
			gzip$1 = (await gzipAsync(content)).length;
			debug$1("[gzip]", chunk.fileName, gzip$1);
		}
		if (options.brotli) {
			brotli = (await brotliCompressAsync(content)).length;
			debug$1("[brotli]", chunk.fileName, brotli);
		}
	}
	return {
		filename: chunk.fileName,
		dts: RE_DTS.test(chunk.fileName),
		isEntry: chunk.type === "chunk" && chunk.isEntry,
		raw,
		rawText: formatBytes(raw),
		gzip: gzip$1,
		gzipText: formatBytes(gzip$1),
		brotli,
		brotliText: formatBytes(brotli)
	};
}

//#endregion
//#region src/features/shebang.ts
const RE_SHEBANG = /^#!.*/;
function ShebangPlugin(logger, cwd, nameLabel, isDualFormat) {
	return {
		name: "tsdown:shebang",
		async writeBundle(options, bundle) {
			for (const chunk of Object.values(bundle)) {
				if (chunk.type !== "chunk" || !chunk.isEntry) continue;
				if (!RE_SHEBANG.test(chunk.code)) continue;
				const filepath = path.resolve(cwd, options.file || path.join(options.dir, chunk.fileName));
				if (await fsExists(filepath)) {
					logger.info(nameLabel, isDualFormat && prettyFormat(options.format), `Granting execute permission to ${underline(path.relative(cwd, filepath))}`);
					await chmod(filepath, 493);
				}
			}
		}
	};
}

//#endregion
//#region src/features/shims.ts
function getShimsInject(format, platform) {
	if (format === "es" && platform === "node") return {
		__dirname: [shimFile, "__dirname"],
		__filename: [shimFile, "__filename"]
	};
}

//#endregion
//#region src/utils/chunks.ts
function addOutDirToChunks(chunks, outDir) {
	return chunks.map((chunk) => {
		chunk.outDir = outDir;
		return chunk;
	});
}

//#endregion
//#region src/features/watch.ts
const endsWithConfig = /[\\/](?:tsdown\.config.*|package\.json|tsconfig\.json)$/;
function WatchPlugin(configFiles, { config, chunks }) {
	return {
		name: "tsdown:watch",
		options: config.ignoreWatch.length ? (inputOptions) => {
			inputOptions.watch ||= {};
			inputOptions.watch.exclude = toArray(inputOptions.watch.exclude);
			inputOptions.watch.exclude.push(...config.ignoreWatch);
		} : void 0,
		buildStart() {
			config.tsconfig && this.addWatchFile(config.tsconfig);
			for (const file of configFiles) this.addWatchFile(file);
			if (typeof config.watch !== "boolean") for (const file of resolveComma(toArray(config.watch))) this.addWatchFile(file);
			if (config.pkg) this.addWatchFile(config.pkg.packageJsonPath);
		},
		generateBundle: {
			order: "post",
			handler(outputOptions, bundle) {
				chunks.push(...addOutDirToChunks(Object.values(bundle), config.outDir));
			}
		}
	};
}

//#endregion
//#region src/features/rolldown.ts
const debug = createDebug("tsdown:rolldown");
async function getBuildOptions(config, format, configFiles, bundle, cjsDts = false, isDualFormat) {
	const inputOptions = await resolveInputOptions(config, format, configFiles, bundle, cjsDts, isDualFormat);
	const outputOptions = await resolveOutputOptions(inputOptions, config, format, cjsDts);
	const rolldownConfig = {
		...inputOptions,
		output: outputOptions,
		write: config.write
	};
	debug("rolldown config with format \"%s\" %O", cjsDts ? "cjs dts" : format, rolldownConfig);
	return rolldownConfig;
}
async function resolveInputOptions(config, format, configFiles, bundle, cjsDts, isDualFormat) {
	const { alias, cjsDefault, cwd, debug: debug$7, dts, entry, env: env$1, external, globImport, loader, logger, nameLabel, nodeProtocol, platform, plugins: userPlugins, report, shims, target, treeshake, tsconfig, unused, watch: watch$1 } = config;
	const plugins = [];
	if (nodeProtocol) plugins.push(NodeProtocolPlugin(nodeProtocol));
	if (config.pkg || config.skipNodeModulesBundle) plugins.push(ExternalPlugin(config));
	if (dts) {
		const { dts: dtsPlugin } = await import("rolldown-plugin-dts");
		const options = {
			tsconfig,
			...dts
		};
		if (format === "es") plugins.push(dtsPlugin(options));
		else if (cjsDts) plugins.push(dtsPlugin({
			...options,
			emitDtsOnly: true,
			cjsDefault
		}));
	}
	if (!cjsDts) {
		if (unused) {
			const { Unused } = await importWithError("unplugin-unused");
			plugins.push(Unused.rolldown({
				root: cwd,
				...unused
			}));
		}
		if (target) plugins.push(await LightningCSSPlugin({ target }));
		const cssPlugin = CssCodeSplitPlugin(config);
		if (cssPlugin) plugins.push(cssPlugin);
		plugins.push(ShebangPlugin(logger, cwd, nameLabel, isDualFormat));
		if (globImport) plugins.push(importGlobPlugin({ root: cwd }));
	}
	if (report && LogLevels[logger.level] >= 3) plugins.push(ReportPlugin(report, logger, cwd, cjsDts, nameLabel, isDualFormat));
	if (watch$1) plugins.push(WatchPlugin(configFiles, bundle));
	if (!cjsDts) plugins.push(userPlugins);
	const define = {
		...config.define,
		...Object.keys(env$1).reduce((acc, key) => {
			const value = JSON.stringify(env$1[key]);
			acc[`process.env.${key}`] = value;
			acc[`import.meta.env.${key}`] = value;
			return acc;
		}, Object.create(null))
	};
	const inject = shims && !cjsDts ? getShimsInject(format, platform) : void 0;
	return await mergeUserOptions({
		input: entry,
		cwd,
		external,
		resolve: { alias },
		tsconfig: tsconfig || void 0,
		treeshake,
		platform: cjsDts || format === "cjs" ? "node" : platform,
		transform: {
			target,
			define,
			inject
		},
		plugins,
		moduleTypes: loader,
		logLevel: logger.level === "error" ? "silent" : logger.level,
		onLog: cjsDefault ? (level, log, defaultHandler) => {
			if (log.code === "MIXED_EXPORT") return;
			defaultHandler(level, log);
		} : void 0,
		debug: debug$7 || void 0,
		checks: { pluginTimings: false }
	}, config.inputOptions, [format, { cjsDts }]);
}
async function resolveOutputOptions(inputOptions, config, format, cjsDts) {
	const { banner, cjsDefault, entry, footer, minify, outDir, sourcemap, unbundle } = config;
	const [entryFileNames, chunkFileNames] = resolveChunkFilename(config, inputOptions, format);
	return await mergeUserOptions({
		format: cjsDts ? "es" : format,
		name: config.globalName,
		sourcemap,
		dir: outDir,
		exports: cjsDefault ? "auto" : "named",
		minify: !cjsDts && minify,
		entryFileNames,
		chunkFileNames,
		preserveModules: unbundle,
		preserveModulesRoot: unbundle ? lowestCommonAncestor(...Object.values(entry)) : void 0,
		postBanner: resolveChunkAddon(banner, format),
		postFooter: resolveChunkAddon(footer, format)
	}, config.outputOptions, [format, { cjsDts }]);
}
async function getDebugRolldownDir() {
	if (!debug.enabled) return;
	return await mkdtemp(join(tmpdir(), "tsdown-config-"));
}
async function debugBuildOptions(dir, name, format, buildOptions) {
	const outFile = join(dir, `rolldown.config.${format}.js`);
	handlePluginInspect(buildOptions.plugins);
	const serialized = util.formatWithOptions({
		depth: null,
		maxArrayLength: null,
		maxStringLength: null
	}, buildOptions);
	await writeFile(outFile, `/*
Auto-generated rolldown config for tsdown debug purposes
tsdown v${version}, rolldown v${VERSION}
Generated on ${(/* @__PURE__ */ new Date()).toISOString()}
Package name: ${name || "not specified"}
*/

export default ${serialized}\n`);
	debug("Wrote debug rolldown config for \"%s\" (%s) -> %s", name || "default name", format, outFile);
}
function handlePluginInspect(plugins) {
	if (Array.isArray(plugins)) for (const plugin of plugins) handlePluginInspect(plugin);
	else if (typeof plugins === "object" && plugins !== null && "name" in plugins) plugins[util.inspect.custom] = function(depth, options, inspect) {
		if ("_options" in plugins) return inspect({
			name: plugins.name,
			options: plugins._options
		}, options);
		else return `"rolldown plugin: ${plugins.name}"`;
	};
}

//#endregion
//#region src/features/shortcuts.ts
function shortcuts(restart) {
	let actionRunning = false;
	async function onInput(input) {
		if (actionRunning) return;
		input = input.trim().toLowerCase();
		const SHORTCUTS = [
			{
				key: "r",
				description: "reload config and rebuild",
				action() {
					restart();
				}
			},
			{
				key: "c",
				description: "clear console",
				action() {
					console.clear();
				}
			},
			{
				key: "q",
				description: "quit",
				action() {
					process.exit(0);
				}
			}
		];
		if (input === "h") {
			const loggedKeys = /* @__PURE__ */ new Set();
			globalLogger.info("  Shortcuts");
			for (const shortcut$1 of SHORTCUTS) {
				if (loggedKeys.has(shortcut$1.key)) continue;
				loggedKeys.add(shortcut$1.key);
				if (shortcut$1.action == null) continue;
				globalLogger.info(dim`  press ` + bold`${shortcut$1.key} + enter` + dim` to ${shortcut$1.description}`);
			}
			return;
		}
		const shortcut = SHORTCUTS.find((shortcut$1) => shortcut$1.key === input);
		if (!shortcut) return;
		actionRunning = true;
		await shortcut.action();
		actionRunning = false;
	}
	const rl = readline.createInterface({ input: process.stdin });
	rl.on("line", onInput);
	return () => rl.close();
}

//#endregion
//#region src/index.ts
const asyncDispose = Symbol.asyncDispose || Symbol.for("Symbol.asyncDispose");
/**
* Build with tsdown.
*/
async function build$1(userOptions = {}) {
	globalLogger.level = userOptions.logLevel || (userOptions.silent ? "error" : "info");
	const { configs, files: configFiles } = await resolveConfig(userOptions);
	let cleanPromise;
	const clean = () => {
		if (cleanPromise) return cleanPromise;
		return cleanPromise = cleanOutDir(configs);
	};
	const disposeCbs = [];
	let restarting = false;
	async function restart() {
		if (restarting) return;
		restarting = true;
		await Promise.all(disposeCbs.map((cb) => cb()));
		clearRequireCache();
		build$1(userOptions);
	}
	const configChunksByPkg = initBundleByPkg(configs);
	function done(bundle) {
		return bundleDone(configChunksByPkg, bundle);
	}
	globalLogger.info("Build start");
	const bundles = await Promise.all(configs.map((options) => {
		return buildSingle(options, configFiles, options.pkg ? configChunksByPkg[options.pkg.packageJsonPath].formats.size > 1 : true, clean, restart, done);
	}));
	const firstDevtoolsConfig = configs.find((config) => config.debug && config.debug.devtools);
	if (configs.some((config) => config.watch)) {
		disposeCbs.push(shortcuts(restart));
		for (const bundle of bundles) disposeCbs.push(bundle[asyncDispose]);
	} else if (firstDevtoolsConfig) {
		const { start } = await importWithError("@vitejs/devtools/cli-commands");
		const devtoolsOptions = firstDevtoolsConfig.debug.devtools;
		await start({
			host: "127.0.0.1",
			open: true,
			...typeof devtoolsOptions === "object" ? devtoolsOptions : {}
		});
	}
	return bundles;
}
/**
* Build a single configuration, without watch and shortcuts features.
*
* Internal API, not for public use
*
* @internal
* @param config Resolved options
*/
async function buildSingle(config, configFiles, isDualFormat, clean, restart, done) {
	const { format, dts, watch: watch$1, logger, outDir } = config;
	const { hooks, context } = await createHooks(config);
	warnLegacyCJS(config);
	const startTime = performance.now();
	await hooks.callHook("build:prepare", context);
	await clean();
	const debugRolldownConfigDir = await getDebugRolldownDir();
	const chunks = [];
	let watcher;
	let ab;
	let updated = false;
	const bundle = {
		chunks,
		config,
		async [asyncDispose]() {
			ab?.abort();
			await watcher?.close();
		}
	};
	const configs = await initBuildOptions();
	if (watch$1) {
		watcher = watch(configs);
		handleWatcher(watcher);
	} else {
		const outputs = await build(configs);
		for (const { output } of outputs) chunks.push(...addOutDirToChunks(output, outDir));
	}
	if (!watch$1) {
		logger.success(config.nameLabel, `Build complete in ${green(`${Math.round(performance.now() - startTime)}ms`)}`);
		await postBuild();
	}
	return bundle;
	function handleWatcher(watcher$1) {
		const changedFile = [];
		let hasError = false;
		watcher$1.on("change", (id, event) => {
			if (event.event === "update") changedFile.push(id);
			if (configFiles.includes(id) || endsWithConfig.test(id)) {
				globalLogger.info(`Reload config: ${id}, restarting...`);
				restart();
			}
		});
		watcher$1.on("event", async (event) => {
			switch (event.code) {
				case "START":
					if (config.clean.length) await cleanChunks(config.outDir, chunks);
					chunks.length = 0;
					hasError = false;
					break;
				case "END":
					if (!hasError) await postBuild();
					break;
				case "BUNDLE_START":
					if (changedFile.length > 0) {
						console.info("");
						logger.info(`Found ${bold(changedFile.join(", "))} changed, rebuilding...`);
					}
					changedFile.length = 0;
					break;
				case "BUNDLE_END":
					await event.result.close();
					logger.success(config.nameLabel, `Rebuilt in ${event.duration}ms.`);
					break;
				case "ERROR":
					await event.result.close();
					logger.error(event.error);
					hasError = true;
					break;
			}
		});
	}
	async function initBuildOptions() {
		const buildOptions = await getBuildOptions(config, format, configFiles, bundle, false, isDualFormat);
		await hooks.callHook("build:before", {
			...context,
			buildOptions
		});
		if (debugRolldownConfigDir) await debugBuildOptions(debugRolldownConfigDir, config.name, format, buildOptions);
		const configs$1 = [buildOptions];
		if (format === "cjs" && dts) configs$1.push(await getBuildOptions(config, format, configFiles, bundle, true, isDualFormat));
		return configs$1;
	}
	async function postBuild() {
		await copy(config);
		if (!updated) await done(bundle);
		await hooks.callHook("build:done", {
			...context,
			chunks
		});
		updated = true;
		ab?.abort();
		ab = executeOnSuccess(config);
	}
}
const dirname$1 = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.resolve(dirname$1, "..");
/** @internal */
const shimFile = path.resolve(pkgRoot, "esm-shims.js");

//#endregion
export { WatchPlugin as a, NodeProtocolPlugin as c, shimFile as i, ExternalPlugin as l, build$1 as n, ShebangPlugin as o, buildSingle as r, ReportPlugin as s, Rolldown as t };