#!/usr/bin/env node
import { a as globalLogger, f as resolveComma, h as toArray } from "./logger-s1ImI5j1.mjs";
import { t as version } from "./package-BZkqghxy.mjs";
import module from "node:module";
import process from "node:process";
import { dim } from "ansis";
import { createDebug, enable, namespaces } from "obug";
import { VERSION } from "rolldown";
import { x } from "tinyexec";
import { cac } from "cac";

//#region src/features/debug.ts
const debug = createDebug("tsdown:debug");
function enableDebugLog(cliOptions) {
	const { debugLogs } = cliOptions;
	if (!debugLogs) return;
	let namespace;
	if (debugLogs === true) namespace = "tsdown:*";
	else namespace = resolveComma(toArray(debugLogs)).map((v) => `tsdown:${v}`).join(",");
	const ns = namespaces();
	if (ns) namespace += `,${ns}`;
	enable(namespace);
	debug("Debugging enabled", namespace);
}

//#endregion
//#region src/cli.ts
const cli = cac("tsdown");
cli.help().version(version);
cli.command("[...files]", "Bundle files", {
	ignoreOptionDefaultValue: true,
	allowUnknownOptions: true
}).option("-c, --config <filename>", "Use a custom config file").option("--config-loader <loader>", "Config loader to use: auto, native, unrun", { default: "auto" }).option("--no-config", "Disable config file").option("-f, --format <format>", "Bundle format: esm, cjs, iife, umd", { default: "esm" }).option("--clean", "Clean output directory, --no-clean to disable").option("--external <module>", "Mark dependencies as external").option("--minify", "Minify output").option("--debug", "Enable debug mode").option("--debug-logs [feat]", "Show debug logs").option("--target <target>", "Bundle target, e.g \"es2015\", \"esnext\"").option("-l, --logLevel <level>", "Set log level: info, warn, error, silent").option("--fail-on-warn", "Fail on warnings", { default: true }).option("--no-write", "Disable writing files to disk, incompatible with watch mode").option("-d, --out-dir <dir>", "Output directory", { default: "dist" }).option("--treeshake", "Tree-shake bundle", { default: true }).option("--sourcemap", "Generate source map", { default: false }).option("--shims", "Enable cjs and esm shims ", { default: false }).option("--platform <platform>", "Target platform", { default: "node" }).option("--dts", "Generate dts files").option("--publint", "Enable publint", { default: false }).option("--attw", "Enable Are the types wrong integration", { default: false }).option("--unused", "Enable unused dependencies check", { default: false }).option("-w, --watch [path]", "Watch mode").option("--ignore-watch <path>", "Ignore custom paths in watch mode").option("--from-vite [vitest]", "Reuse config from Vite or Vitest").option("--report", "Size report", { default: true }).option("--env.* <value>", "Define compile-time env variables").option("--env-file <file>", "Load environment variables from a file, when used together with --env, variables in --env take precedence").option("--env-prefix <prefix>", "Prefix for env variables to inject into the bundle", { default: "TSDOWN_" }).option("--on-success <command>", "Command to run on success").option("--copy <dir>", "Copy files to output dir").option("--public-dir <dir>", "Alias for --copy, deprecated").option("--tsconfig <tsconfig>", "Set tsconfig path").option("--unbundle", "Unbundle mode").option("-W, --workspace [dir]", "Enable workspace mode").option("-F, --filter <pattern>", "Filter configs (cwd or name), e.g. /pkg-name$/ or pkg-name").option("--exports", "Generate export-related metadata for package.json (experimental)").action(async (input, flags) => {
	globalLogger.level = flags.logLevel || (flags.silent ? "error" : "info");
	globalLogger.info(`tsdown ${dim`v${version}`} powered by rolldown ${dim`v${VERSION}`}`);
	const { build: build$1 } = await import("./index.mjs");
	if (input.length > 0) flags.entry = input;
	await build$1(flags);
});
cli.command("create", "[deprecated] Create a tsdown project. Use \"npx create-tsdown\" instead.", { allowUnknownOptions: true }).action(async () => {
	globalLogger.warn(`"tsdown create" is deprecated. Please use "npx create-tsdown" instead.`);
	const { exitCode } = await x("npx", [
		"-y",
		"create-tsdown@latest",
		...process.argv.slice(3)
	], { nodeOptions: { stdio: "inherit" } });
	process.exitCode = exitCode;
});
cli.command("migrate", "[deprecated] Migrate from tsup to tsdown. Use \"npx tsdown-migrate\" instead.", { allowUnknownOptions: true }).action(async () => {
	globalLogger.warn(`"tsdown migrate" is deprecated. Please use "npx tsdown-migrate" instead.`);
	const { exitCode } = await x("npx", [
		"-y",
		"tsdown-migrate@latest",
		...process.argv.slice(3)
	], { nodeOptions: { stdio: "inherit" } });
	process.exitCode = exitCode;
});
async function runCLI() {
	cli.parse(process.argv, { run: false });
	enableDebugLog(cli.options);
	try {
		await cli.runMatchedCommand();
	} catch (error) {
		globalLogger.error(String(error.stack || error.message));
		process.exit(1);
	}
}

//#endregion
//#region src/run.ts
try {
	module.enableCompileCache?.();
} catch {}
runCLI();

//#endregion
export {  };