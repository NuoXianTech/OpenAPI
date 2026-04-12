import { a as resolve, i as relative, n as basename, r as dirname } from "./libs/nypm.mjs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createWriteStream, existsSync, readdirSync, renameSync } from "node:fs";
import { pipeline } from "node:stream";
import { spawnSync } from "node:child_process";
import { homedir, tmpdir } from "node:os";
import { promisify } from "node:util";
async function download(url, filePath, options = {}) {
	const infoPath = filePath + ".json";
	const info = JSON.parse(await readFile(infoPath, "utf8").catch(() => "{}"));
	const etag = (await sendFetch(url, {
		method: "HEAD",
		headers: options.headers
	}).catch(() => void 0))?.headers.get("etag");
	if (info.etag === etag && existsSync(filePath)) return;
	if (typeof etag === "string") info.etag = etag;
	const response = await sendFetch(url, { headers: options.headers });
	if (response.status >= 400) throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
	const stream = createWriteStream(filePath);
	await promisify(pipeline)(response.body, stream);
	await writeFile(infoPath, JSON.stringify(info), "utf8");
}
const inputRegex = /^(?<repo>[\w.-]+\/[\w.-]+)(?<subdir>[^#]+)?(?<ref>#[\w./@-]+)?/;
function parseGitURI(input) {
	const m = input.match(inputRegex)?.groups || {};
	return {
		repo: m.repo || "",
		subdir: m.subdir || "/",
		ref: m.ref ? m.ref.slice(1) : "main"
	};
}
function debug(...args) {
	if (process.env.DEBUG) console.debug("[giget]", ...args);
}
async function sendFetch(url, options = {}) {
	if (options.headers?.["sec-fetch-mode"]) options.mode = options.headers["sec-fetch-mode"];
	const res = await fetch(url, {
		...options,
		headers: normalizeHeaders(options.headers)
	}).catch((error) => {
		throw new Error(`Failed to download ${url}: ${error}`, { cause: error });
	});
	if (options.validateStatus && res.status >= 400) throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
	return res;
}
function cacheDirectory() {
	const cacheDir = process.env.XDG_CACHE_HOME ? resolve(process.env.XDG_CACHE_HOME, "giget") : resolve(homedir(), ".cache/giget");
	if (process.platform === "win32") {
		const windowsCacheDir = resolve(tmpdir(), "giget");
		if (!existsSync(windowsCacheDir) && existsSync(cacheDir)) try {
			renameSync(cacheDir, windowsCacheDir);
		} catch {}
		return windowsCacheDir;
	}
	return cacheDir;
}
function normalizeHeaders(headers = {}) {
	const normalized = {};
	for (const [key, value] of Object.entries(headers)) {
		if (!value) continue;
		normalized[key.toLowerCase()] = value;
	}
	return normalized;
}
function currentShell() {
	if (process.env.SHELL) return process.env.SHELL;
	if (process.platform === "win32") return "cmd.exe";
	return "/bin/bash";
}
function startShell(cwd) {
	cwd = resolve(cwd);
	const shell = currentShell();
	console.info(`(experimental) Opening shell in ${relative(process.cwd(), cwd)}...`);
	spawnSync(shell, [], {
		cwd,
		shell: true,
		stdio: "inherit"
	});
}
const http = async (input, options) => {
	if (input.endsWith(".json")) return await _httpJSON(input, options);
	const url = new URL(input);
	let name = basename(url.pathname);
	try {
		const head = await sendFetch(url.href, {
			method: "HEAD",
			validateStatus: true,
			headers: { authorization: options.auth ? `Bearer ${options.auth}` : void 0 }
		});
		if ((head.headers.get("content-type") || "").includes("application/json")) return await _httpJSON(input, options);
		const filename = head.headers.get("content-disposition")?.match(/filename="?(.+)"?/)?.[1];
		if (filename) name = filename.split(".")[0];
	} catch (error) {
		debug(`Failed to fetch HEAD for ${url.href}:`, error);
	}
	return {
		name: `${name}-${url.href.slice(0, 8)}`,
		version: "",
		subdir: "",
		tar: url.href,
		defaultDir: name,
		headers: { Authorization: options.auth ? `Bearer ${options.auth}` : void 0 }
	};
};
const _httpJSON = async (input, options) => {
	const info = await (await sendFetch(input, {
		validateStatus: true,
		headers: { authorization: options.auth ? `Bearer ${options.auth}` : void 0 }
	})).json();
	if (!info.tar || !info.name) throw new Error(`Invalid template info from ${input}. name or tar fields are missing!`);
	return info;
};
const github = (input, options) => {
	const parsed = parseGitURI(input);
	const githubAPIURL = process.env.GIGET_GITHUB_URL || "https://api.github.com";
	return {
		name: parsed.repo.replace("/", "-"),
		version: parsed.ref,
		subdir: parsed.subdir,
		headers: {
			Authorization: options.auth ? `Bearer ${options.auth}` : void 0,
			Accept: "application/vnd.github+json",
			"X-GitHub-Api-Version": "2022-11-28"
		},
		url: `${githubAPIURL.replace("api.github.com", "github.com")}/${parsed.repo}/tree/${parsed.ref}${parsed.subdir}`,
		tar: `${githubAPIURL}/repos/${parsed.repo}/tarball/${parsed.ref}`
	};
};
const gitlab = (input, options) => {
	const parsed = parseGitURI(input);
	const gitlab = process.env.GIGET_GITLAB_URL || "https://gitlab.com";
	return {
		name: parsed.repo.replace("/", "-"),
		version: parsed.ref,
		subdir: parsed.subdir,
		headers: {
			authorization: options.auth ? `Bearer ${options.auth}` : void 0,
			"sec-fetch-mode": "same-origin"
		},
		url: `${gitlab}/${parsed.repo}/tree/${parsed.ref}${parsed.subdir}`,
		tar: `${gitlab}/${parsed.repo}/-/archive/${parsed.ref}.tar.gz`
	};
};
const bitbucket = (input, options) => {
	const parsed = parseGitURI(input);
	return {
		name: parsed.repo.replace("/", "-"),
		version: parsed.ref,
		subdir: parsed.subdir,
		headers: { authorization: options.auth ? `Bearer ${options.auth}` : void 0 },
		url: `https://bitbucket.com/${parsed.repo}/src/${parsed.ref}${parsed.subdir}`,
		tar: `https://bitbucket.org/${parsed.repo}/get/${parsed.ref}.tar.gz`
	};
};
const sourcehut = (input, options) => {
	const parsed = parseGitURI(input);
	return {
		name: parsed.repo.replace("/", "-"),
		version: parsed.ref,
		subdir: parsed.subdir,
		headers: { authorization: options.auth ? `Bearer ${options.auth}` : void 0 },
		url: `https://git.sr.ht/~${parsed.repo}/tree/${parsed.ref}/item${parsed.subdir}`,
		tar: `https://git.sr.ht/~${parsed.repo}/archive/${parsed.ref}.tar.gz`
	};
};
const providers = {
	http,
	https: http,
	github,
	gh: github,
	gitlab,
	bitbucket,
	sourcehut
};
const DEFAULT_REGISTRY = "https://raw.githubusercontent.com/unjs/giget/main/templates";
const registryProvider = (registryEndpoint = DEFAULT_REGISTRY, options = {}) => {
	return (async (input) => {
		const start = Date.now();
		const registryURL = `${registryEndpoint}/${input}.json`;
		const result = await sendFetch(registryURL, { headers: { authorization: options.auth ? `Bearer ${options.auth}` : void 0 } });
		if (result.status >= 400) throw new Error(`Failed to download ${input} template info from ${registryURL}: ${result.status} ${result.statusText}`);
		const info = await result.json();
		if (!info.tar || !info.name) throw new Error(`Invalid template info from ${registryURL}. name or tar fields are missing!`);
		debug(`Fetched ${input} template info from ${registryURL} in ${Date.now() - start}ms`);
		return info;
	});
};
const sourceProtoRe = /^([\w-.]+):/;
async function downloadTemplate(input, options = {}) {
	options.registry = process.env.GIGET_REGISTRY ?? options.registry;
	options.auth = process.env.GIGET_AUTH ?? options.auth;
	const registry = options.registry === false ? void 0 : registryProvider(options.registry, { auth: options.auth });
	let providerName = options.provider || (registry ? "registry" : "github");
	let source = input;
	const sourceProviderMatch = input.match(sourceProtoRe);
	if (sourceProviderMatch) {
		providerName = sourceProviderMatch[1];
		source = input.slice(sourceProviderMatch[0].length);
		if (providerName === "http" || providerName === "https") source = input;
	}
	const provider = options.providers?.[providerName] || providers[providerName] || registry;
	if (!provider) throw new Error(`Unsupported provider: ${providerName}`);
	const template = await Promise.resolve().then(() => provider(source, { auth: options.auth })).catch((error) => {
		throw new Error(`Failed to download template from ${providerName}: ${error.message}`);
	});
	if (!template) throw new Error(`Failed to resolve template from ${providerName}`);
	template.name = (template.name || "template").replace(/[^\da-z-]/gi, "-");
	template.defaultDir = (template.defaultDir || template.name).replace(/[^\da-z-]/gi, "-");
	const tarPath = resolve(resolve(cacheDirectory(), providerName, template.name), (template.version || template.name) + ".tar.gz");
	if (options.preferOffline && existsSync(tarPath)) options.offline = true;
	if (!options.offline) {
		await mkdir(dirname(tarPath), { recursive: true });
		const s = Date.now();
		await download(template.tar, tarPath, { headers: {
			Authorization: options.auth ? `Bearer ${options.auth}` : void 0,
			...normalizeHeaders(template.headers)
		} }).catch((error) => {
			if (!existsSync(tarPath)) throw error;
			debug("Download error. Using cached version:", error);
			options.offline = true;
		});
		debug(`Downloaded ${template.tar} to ${tarPath} in ${Date.now() - s}ms`);
	}
	if (!existsSync(tarPath)) throw new Error(`Tarball not found: ${tarPath} (offline: ${options.offline})`);
	const extractPath = resolve(resolve(options.cwd || "."), options.dir || template.defaultDir);
	if (options.forceClean) await rm(extractPath, {
		recursive: true,
		force: true
	});
	if (!options.force && existsSync(extractPath) && readdirSync(extractPath).length > 0) throw new Error(`Destination ${extractPath} already exists.`);
	await mkdir(extractPath, { recursive: true });
	const s = Date.now();
	const subdir = template.subdir?.replace(/^\//, "") || "";
	const { extract } = await import("./libs/tar.mjs").then((n) => n.t);
	await extract({
		file: tarPath,
		cwd: extractPath,
		onReadEntry(entry) {
			entry.path = entry.path.split("/").splice(1).join("/");
			if (subdir) if (entry.path.startsWith(subdir + "/")) entry.path = entry.path.slice(subdir.length);
			else entry.path = "";
		}
	});
	debug(`Extracted to ${extractPath} in ${Date.now() - s}ms`);
	if (options.install) {
		debug("Installing dependencies...");
		const { installDependencies } = await import("./libs/nypm.mjs").then((n) => n.t);
		await installDependencies({
			cwd: extractPath,
			silent: options.silent,
			...typeof options.install === "object" ? options.install : {}
		});
	}
	return {
		...template,
		source,
		dir: extractPath
	};
}
export { registryProvider as n, startShell as r, downloadTemplate as t };
