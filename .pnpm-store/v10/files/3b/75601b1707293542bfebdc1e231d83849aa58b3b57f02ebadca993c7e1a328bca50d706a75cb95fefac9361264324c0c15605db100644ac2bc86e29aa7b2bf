import { t as __exportAll } from "../rolldown-runtime.mjs";
import "node:module";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { PassThrough } from "node:stream";
import { spawn } from "node:child_process";
import { createRequire } from "module";
import { delimiter, dirname, join, normalize, resolve } from "node:path";
import { cwd } from "node:process";
import c from "node:readline";
const _DRIVE_LETTER_START_RE = /^[A-Za-z]:\//;
function normalizeWindowsPath(e = ``) {
	return e && e.replace(/\\/g, `/`).replace(_DRIVE_LETTER_START_RE, (e) => e.toUpperCase());
}
const _UNC_REGEX = /^[/\\]{2}/, _IS_ABSOLUTE_RE = /^[/\\](?![/\\])|^[/\\]{2}(?!\.)|^[A-Za-z]:[/\\]/, _DRIVE_LETTER_RE = /^[A-Za-z]:$/, _ROOT_FOLDER_RE = /^\/([A-Za-z]:)?$/, normalize$1 = function(e) {
	if (e.length === 0) return `.`;
	e = normalizeWindowsPath(e);
	let t = e.match(_UNC_REGEX), n = isAbsolute(e), r = e[e.length - 1] === `/`;
	return e = normalizeString(e, !n), e.length === 0 ? n ? `/` : r ? `./` : `.` : (r && (e += `/`), _DRIVE_LETTER_RE.test(e) && (e += `/`), t ? n ? `//${e}` : `//./${e}` : n && !isAbsolute(e) ? `/${e}` : e);
}, join$1 = function(...e) {
	let t = ``;
	for (let n of e) if (n) if (t.length > 0) {
		let e = t[t.length - 1] === `/`, r = n[0] === `/`;
		e && r ? t += n.slice(1) : t += e || r ? n : `/${n}`;
	} else t += n;
	return normalize$1(t);
};
function cwd$1() {
	return typeof process < `u` && typeof process.cwd == `function` ? process.cwd().replace(/\\/g, `/`) : `/`;
}
const resolve$1 = function(...e) {
	e = e.map((e) => normalizeWindowsPath(e));
	let t = ``, n = !1;
	for (let r = e.length - 1; r >= -1 && !n; r--) {
		let i = r >= 0 ? e[r] : cwd$1();
		!i || i.length === 0 || (t = `${i}/${t}`, n = isAbsolute(i));
	}
	return t = normalizeString(t, !n), n && !isAbsolute(t) ? `/${t}` : t.length > 0 ? t : `.`;
};
function normalizeString(e, t) {
	let n = ``, r = 0, i = -1, a = 0, o = null;
	for (let s = 0; s <= e.length; ++s) {
		if (s < e.length) o = e[s];
		else if (o === `/`) break;
		else o = `/`;
		if (o === `/`) {
			if (!(i === s - 1 || a === 1)) if (a === 2) {
				if (n.length < 2 || r !== 2 || n[n.length - 1] !== `.` || n[n.length - 2] !== `.`) {
					if (n.length > 2) {
						let e = n.lastIndexOf(`/`);
						e === -1 ? (n = ``, r = 0) : (n = n.slice(0, e), r = n.length - 1 - n.lastIndexOf(`/`)), i = s, a = 0;
						continue;
					} else if (n.length > 0) {
						n = ``, r = 0, i = s, a = 0;
						continue;
					}
				}
				t && (n += n.length > 0 ? `/..` : `..`, r = 2);
			} else n.length > 0 ? n += `/${e.slice(i + 1, s)}` : n = e.slice(i + 1, s), r = s - i - 1;
			i = s, a = 0;
		} else o === `.` && a !== -1 ? ++a : a = -1;
	}
	return n;
}
const isAbsolute = function(e) {
	return _IS_ABSOLUTE_RE.test(e);
}, relative = function(e, t) {
	let n = resolve$1(e).replace(_ROOT_FOLDER_RE, `$1`).split(`/`), r = resolve$1(t).replace(_ROOT_FOLDER_RE, `$1`).split(`/`);
	if (r[0][1] === `:` && n[0][1] === `:` && n[0] !== r[0]) return r.join(`/`);
	let i = [...n];
	for (let e of i) {
		if (r[0] !== e) break;
		n.shift(), r.shift();
	}
	return [...n.map(() => `..`), ...r].join(`/`);
}, dirname$1 = function(e) {
	let t = normalizeWindowsPath(e).replace(/\/$/, ``).split(`/`).slice(0, -1);
	return t.length === 1 && _DRIVE_LETTER_RE.test(t[0]) && (t[0] += `/`), t.join(`/`) || (isAbsolute(e) ? `/` : `.`);
}, basename$1 = function(e, t) {
	let n = normalizeWindowsPath(e).split(`/`), r = ``;
	for (let e = n.length - 1; e >= 0; e--) {
		let t = n[e];
		if (t) {
			r = t;
			break;
		}
	}
	return t && r.endsWith(t) ? r.slice(0, -t.length) : r;
};
var l = Object.create, u = Object.defineProperty, d = Object.getOwnPropertyDescriptor, f = Object.getOwnPropertyNames, p = Object.getPrototypeOf, m = Object.prototype.hasOwnProperty, h = (e, t) => () => (t || e((t = { exports: {} }).exports, t), t.exports), g = (e, t, n, r) => {
	if (t && typeof t == `object` || typeof t == `function`) for (var i = f(t), a = 0, o = i.length, s; a < o; a++) s = i[a], !m.call(e, s) && s !== n && u(e, s, {
		get: ((e) => t[e]).bind(null, s),
		enumerable: !(r = d(t, s)) || r.enumerable
	});
	return e;
}, _ = (e, t, n) => (n = e == null ? {} : l(p(e)), g(t || !e || !e.__esModule ? u(n, `default`, {
	value: e,
	enumerable: !0
}) : n, e)), v = createRequire(import.meta.url);
const y = /^path$/i, b = {
	key: `PATH`,
	value: ``
};
function x(e) {
	for (let t in e) {
		if (!Object.prototype.hasOwnProperty.call(e, t) || !y.test(t)) continue;
		let n = e[t];
		return n ? {
			key: t,
			value: n
		} : b;
	}
	return b;
}
function S(e, t) {
	let n = t.value.split(delimiter), r = e, i;
	do
		n.push(resolve(r, `node_modules`, `.bin`)), i = r, r = dirname(r);
	while (r !== i);
	return {
		key: t.key,
		value: n.join(delimiter)
	};
}
function C(e, t) {
	let n = {
		...process.env,
		...t
	}, r = S(e, x(n));
	return n[r.key] = r.value, n;
}
const w = (e) => {
	let t = e.length, n = new PassThrough(), i = () => {
		--t === 0 && n.emit(`end`);
	};
	for (let t of e) t.pipe(n, { end: !1 }), t.on(`end`, i);
	return n;
};
var T = h((e, t) => {
	t.exports = a, a.sync = o;
	var n = v(`fs`);
	function r(e, t) {
		var n = t.pathExt === void 0 ? process.env.PATHEXT : t.pathExt;
		if (!n || (n = n.split(`;`), n.indexOf(``) !== -1)) return !0;
		for (var r = 0; r < n.length; r++) {
			var i = n[r].toLowerCase();
			if (i && e.substr(-i.length).toLowerCase() === i) return !0;
		}
		return !1;
	}
	function i(e, t, n) {
		return !e.isSymbolicLink() && !e.isFile() ? !1 : r(t, n);
	}
	function a(e, t, r) {
		n.stat(e, function(n, a) {
			r(n, n ? !1 : i(a, e, t));
		});
	}
	function o(e, t) {
		return i(n.statSync(e), e, t);
	}
}), E = h((e, t) => {
	t.exports = r, r.sync = i;
	var n = v(`fs`);
	function r(e, t, r) {
		n.stat(e, function(e, n) {
			r(e, e ? !1 : a(n, t));
		});
	}
	function i(e, t) {
		return a(n.statSync(e), t);
	}
	function a(e, t) {
		return e.isFile() && o(e, t);
	}
	function o(e, t) {
		var n = e.mode, r = e.uid, i = e.gid, a = t.uid === void 0 ? process.getuid && process.getuid() : t.uid, o = t.gid === void 0 ? process.getgid && process.getgid() : t.gid, s = 64, L = 8, J = 1, Y = s | L;
		return n & J || n & L && i === o || n & s && r === a || n & Y && a === 0;
	}
}), D = h((e, t) => {
	v(`fs`);
	var n = process.platform === `win32` || global.TESTING_WINDOWS ? T() : E();
	t.exports = r, r.sync = i;
	function r(e, t, i) {
		if (typeof t == `function` && (i = t, t = {}), !i) {
			if (typeof Promise != `function`) throw TypeError(`callback not provided`);
			return new Promise(function(n, i) {
				r(e, t || {}, function(e, t) {
					e ? i(e) : n(t);
				});
			});
		}
		n(e, t || {}, function(e, n) {
			e && (e.code === `EACCES` || t && t.ignoreErrors) && (e = null, n = !1), i(e, n);
		});
	}
	function i(e, t) {
		try {
			return n.sync(e, t || {});
		} catch (e) {
			if (t && t.ignoreErrors || e.code === `EACCES`) return !1;
			throw e;
		}
	}
}), O = h((e, t) => {
	let n = process.platform === `win32` || process.env.OSTYPE === `cygwin` || process.env.OSTYPE === `msys`, r = v(`path`), i = n ? `;` : `:`, a = D(), o = (e) => Object.assign(Error(`not found: ${e}`), { code: `ENOENT` }), s = (e, t) => {
		let r = t.colon || i, a = e.match(/\//) || n && e.match(/\\/) ? [``] : [...n ? [process.cwd()] : [], ...(t.path || process.env.PATH || ``).split(r)], o = n ? t.pathExt || process.env.PATHEXT || `.EXE;.CMD;.BAT;.COM` : ``, s = n ? o.split(r) : [``];
		return n && e.indexOf(`.`) !== -1 && s[0] !== `` && s.unshift(``), {
			pathEnv: a,
			pathExt: s,
			pathExtExe: o
		};
	}, L = (e, t, n) => {
		typeof t == `function` && (n = t, t = {}), t ||= {};
		let { pathEnv: i, pathExt: L, pathExtExe: J } = s(e, t), Y = [], X = (n) => new Promise((a, s) => {
			if (n === i.length) return t.all && Y.length ? a(Y) : s(o(e));
			let L = i[n], J = /^".*"$/.test(L) ? L.slice(1, -1) : L, X = r.join(J, e);
			a(Z(!J && /^\.[\\\/]/.test(e) ? e.slice(0, 2) + X : X, n, 0));
		}), Z = (e, n, r) => new Promise((i, o) => {
			if (r === L.length) return i(X(n + 1));
			let s = L[r];
			a(e + s, { pathExt: J }, (a, o) => {
				if (!a && o) if (t.all) Y.push(e + s);
				else return i(e + s);
				return i(Z(e, n, r + 1));
			});
		});
		return n ? X(0).then((e) => n(null, e), n) : X(0);
	};
	t.exports = L, L.sync = (e, t) => {
		t ||= {};
		let { pathEnv: n, pathExt: i, pathExtExe: L } = s(e, t), J = [];
		for (let o = 0; o < n.length; o++) {
			let s = n[o], Y = /^".*"$/.test(s) ? s.slice(1, -1) : s, X = r.join(Y, e), Z = !Y && /^\.[\\\/]/.test(e) ? e.slice(0, 2) + X : X;
			for (let e = 0; e < i.length; e++) {
				let n = Z + i[e];
				try {
					if (a.sync(n, { pathExt: L })) if (t.all) J.push(n);
					else return n;
				} catch {}
			}
		}
		if (t.all && J.length) return J;
		if (t.nothrow) return null;
		throw o(e);
	};
}), k = h((e, t) => {
	let n = (e = {}) => {
		let t = e.env || process.env;
		return (e.platform || process.platform) === `win32` ? Object.keys(t).reverse().find((e) => e.toUpperCase() === `PATH`) || `Path` : `PATH`;
	};
	t.exports = n, t.exports.default = n;
}), A = h((e, t) => {
	let n = v(`path`), r = O(), i = k();
	function a(e, t) {
		let a = e.options.env || process.env, o = process.cwd(), s = e.options.cwd != null, L = s && process.chdir !== void 0 && !process.chdir.disabled;
		if (L) try {
			process.chdir(e.options.cwd);
		} catch {}
		let J;
		try {
			J = r.sync(e.command, {
				path: a[i({ env: a })],
				pathExt: t ? n.delimiter : void 0
			});
		} catch {} finally {
			L && process.chdir(o);
		}
		return J &&= n.resolve(s ? e.options.cwd : ``, J), J;
	}
	function o(e) {
		return a(e) || a(e, !0);
	}
	t.exports = o;
}), j = h((e, t) => {
	let n = /([()\][%!^"`<>&|;, *?])/g;
	function r(e) {
		return e = e.replace(n, `^$1`), e;
	}
	function i(e, t) {
		return e = `${e}`, e = e.replace(/(\\*)"/g, `$1$1\\"`), e = e.replace(/(\\*)$/, `$1$1`), e = `"${e}"`, e = e.replace(n, `^$1`), t && (e = e.replace(n, `^$1`)), e;
	}
	t.exports.command = r, t.exports.argument = i;
}), M = h((e, t) => {
	t.exports = /^#!(.*)/;
}), N = h((e, t) => {
	let n = M();
	t.exports = (e = ``) => {
		let t = e.match(n);
		if (!t) return null;
		let [r, i] = t[0].replace(/#! ?/, ``).split(` `), a = r.split(`/`).pop();
		return a === `env` ? i : i ? `${a} ${i}` : a;
	};
}), P = h((e, t) => {
	let n = v(`fs`), r = N();
	function i(e) {
		let t = Buffer.alloc(150), i;
		try {
			i = n.openSync(e, `r`), n.readSync(i, t, 0, 150, 0), n.closeSync(i);
		} catch {}
		return r(t.toString());
	}
	t.exports = i;
}), F = h((e, t) => {
	let n = v(`path`), r = A(), i = j(), a = P(), o = process.platform === `win32`, s = /\.(?:com|exe)$/i, L = /node_modules[\\/].bin[\\/][^\\/]+\.cmd$/i;
	function J(e) {
		e.file = r(e);
		let t = e.file && a(e.file);
		return t ? (e.args.unshift(e.file), e.command = t, r(e)) : e.file;
	}
	function Y(e) {
		if (!o) return e;
		let t = J(e), r = !s.test(t);
		if (e.options.forceShell || r) {
			let r = L.test(t);
			e.command = n.normalize(e.command), e.command = i.command(e.command), e.args = e.args.map((e) => i.argument(e, r)), e.args = [
				`/d`,
				`/s`,
				`/c`,
				`"${[e.command].concat(e.args).join(` `)}"`
			], e.command = process.env.comspec || `cmd.exe`, e.options.windowsVerbatimArguments = !0;
		}
		return e;
	}
	function X(e, t, n) {
		t && !Array.isArray(t) && (n = t, t = null), t = t ? t.slice(0) : [], n = Object.assign({}, n);
		let r = {
			command: e,
			args: t,
			options: n,
			file: void 0,
			original: {
				command: e,
				args: t
			}
		};
		return n.shell ? r : Y(r);
	}
	t.exports = X;
}), I = h((e, t) => {
	let n = process.platform === `win32`;
	function r(e, t) {
		return Object.assign(Error(`${t} ${e.command} ENOENT`), {
			code: `ENOENT`,
			errno: `ENOENT`,
			syscall: `${t} ${e.command}`,
			path: e.command,
			spawnargs: e.args
		});
	}
	function i(e, t) {
		if (!n) return;
		let r = e.emit;
		e.emit = function(n, i) {
			if (n === `exit`) {
				let n = a(i, t, `spawn`);
				if (n) return r.call(e, `error`, n);
			}
			return r.apply(e, arguments);
		};
	}
	function a(e, t) {
		return n && e === 1 && !t.file ? r(t.original, `spawn`) : null;
	}
	function o(e, t) {
		return n && e === 1 && !t.file ? r(t.original, `spawnSync`) : null;
	}
	t.exports = {
		hookChildProcess: i,
		verifyENOENT: a,
		verifyENOENTSync: o,
		notFoundError: r
	};
}), R = _(h((e, t) => {
	let n = v(`child_process`), r = F(), i = I();
	function a(e, t, a) {
		let o = r(e, t, a), s = n.spawn(o.command, o.args, o.options);
		return i.hookChildProcess(s, o), s;
	}
	function o(e, t, a) {
		let o = r(e, t, a), s = n.spawnSync(o.command, o.args, o.options);
		return s.error = s.error || i.verifyENOENTSync(s.status, o), s;
	}
	t.exports = a, t.exports.spawn = a, t.exports.sync = o, t.exports._parse = r, t.exports._enoent = i;
})(), 1), z = class extends Error {
	result;
	output;
	get exitCode() {
		if (this.result.exitCode !== null) return this.result.exitCode;
	}
	constructor(e, t) {
		super(`Process exited with non-zero status (${e.exitCode})`), this.result = e, this.output = t;
	}
};
const B = {
	timeout: void 0,
	persist: !1
}, V = { windowsHide: !0 };
function H(e, t) {
	return {
		command: normalize(e),
		args: t ?? []
	};
}
function U(e) {
	let t = new AbortController();
	for (let n of e) {
		if (n.aborted) return t.abort(), n;
		n.addEventListener(`abort`, () => {
			t.abort(n.reason);
		}, { signal: t.signal });
	}
	return t.signal;
}
async function W(e) {
	let t = ``;
	for await (let n of e) t += n.toString();
	return t;
}
var G = class {
	_process;
	_aborted = !1;
	_options;
	_command;
	_args;
	_resolveClose;
	_processClosed;
	_thrownError;
	get process() {
		return this._process;
	}
	get pid() {
		return this._process?.pid;
	}
	get exitCode() {
		if (this._process && this._process.exitCode !== null) return this._process.exitCode;
	}
	constructor(e, t, n) {
		this._options = {
			...B,
			...n
		}, this._command = e, this._args = t ?? [], this._processClosed = new Promise((e) => {
			this._resolveClose = e;
		});
	}
	kill(e) {
		return this._process?.kill(e) === !0;
	}
	get aborted() {
		return this._aborted;
	}
	get killed() {
		return this._process?.killed === !0;
	}
	pipe(e, t, n) {
		return q(e, t, {
			...n,
			stdin: this
		});
	}
	async *[Symbol.asyncIterator]() {
		let e = this._process;
		if (!e) return;
		let t = [];
		this._streamErr && t.push(this._streamErr), this._streamOut && t.push(this._streamOut);
		let n = w(t), r = c.createInterface({ input: n });
		for await (let e of r) yield e.toString();
		if (await this._processClosed, e.removeAllListeners(), this._thrownError) throw this._thrownError;
		if (this._options?.throwOnError && this.exitCode !== 0 && this.exitCode !== void 0) throw new z(this);
	}
	async _waitForOutput() {
		let e = this._process;
		if (!e) throw Error(`No process was started`);
		let [t, n] = await Promise.all([this._streamOut ? W(this._streamOut) : ``, this._streamErr ? W(this._streamErr) : ``]);
		if (await this._processClosed, this._options?.stdin && await this._options.stdin, e.removeAllListeners(), this._thrownError) throw this._thrownError;
		let r = {
			stderr: n,
			stdout: t,
			exitCode: this.exitCode
		};
		if (this._options.throwOnError && this.exitCode !== 0 && this.exitCode !== void 0) throw new z(this, r);
		return r;
	}
	then(e, t) {
		return this._waitForOutput().then(e, t);
	}
	_streamOut;
	_streamErr;
	spawn() {
		let e = cwd(), t = this._options, n = {
			...V,
			...t.nodeOptions
		}, r = [];
		this._resetState(), t.timeout !== void 0 && r.push(AbortSignal.timeout(t.timeout)), t.signal !== void 0 && r.push(t.signal), t.persist === !0 && (n.detached = !0), r.length > 0 && (n.signal = U(r)), n.env = C(e, n.env);
		let { command: a, args: o } = H(this._command, this._args), s = (0, R._parse)(a, o, n), L = spawn(s.command, s.args, s.options);
		if (L.stderr && (this._streamErr = L.stderr), L.stdout && (this._streamOut = L.stdout), this._process = L, L.once(`error`, this._onError), L.once(`close`, this._onClose), t.stdin !== void 0 && L.stdin && t.stdin.process) {
			let { stdout: e } = t.stdin.process;
			e && e.pipe(L.stdin);
		}
	}
	_resetState() {
		this._aborted = !1, this._processClosed = new Promise((e) => {
			this._resolveClose = e;
		}), this._thrownError = void 0;
	}
	_onError = (e) => {
		if (e.name === `AbortError` && (!(e.cause instanceof Error) || e.cause.name !== `TimeoutError`)) {
			this._aborted = !0;
			return;
		}
		this._thrownError = e;
	};
	_onClose = () => {
		this._resolveClose && this._resolveClose();
	};
};
const K = (e, t, n) => {
	let r = new G(e, t, n);
	return r.spawn(), r;
}, q = K;
var dist_exports = __exportAll({
	detectPackageManager: () => detectPackageManager,
	installDependencies: () => installDependencies,
	packageManagers: () => packageManagers
});
async function findup(e, t, n = {}) {
	let r = normalize$1(e).split(`/`);
	for (; r.length > 0;) {
		let e = await t(r.join(`/`) || `/`);
		if (e || !n.includeParentDirs) return e;
		r.pop();
	}
}
function cached(e) {
	let t;
	return () => (t === void 0 && (t = e().then((e) => (t = e, t))), t);
}
const hasCorepack = cached(async () => {
	if (globalThis.process?.versions?.webcontainer) return !1;
	try {
		let { exitCode: e } = await K(`corepack`, [`--version`]);
		return e === 0;
	} catch {
		return !1;
	}
});
async function executeCommand(e, t, n = {}) {
	let r = e !== `npm` && e !== `bun` && e !== `deno` && n.corepack !== !1 && await hasCorepack() ? [`corepack`, [e, ...t]] : [e, t], { exitCode: i, stdout: a, stderr: o } = await K(r[0], r[1], { nodeOptions: {
		cwd: resolve$1(n.cwd || process.cwd()),
		env: n.env,
		stdio: n.silent ? `pipe` : `inherit`
	} });
	if (i !== 0) throw Error(`\`${r.flat().join(` `)}\` failed.${n.silent ? [
		``,
		a,
		o
	].join(`
`) : ``}`);
}
async function resolveOperationOptions(e = {}) {
	let t = e.cwd || process.cwd(), n = {
		...process.env,
		...e.env
	}, r = (typeof e.packageManager == `string` ? packageManagers.find((t) => t.name === e.packageManager) : e.packageManager) || await detectPackageManager(e.cwd || process.cwd());
	if (!r) throw Error(`No package manager auto-detected.`);
	return {
		cwd: t,
		env: n,
		silent: e.silent ?? !1,
		packageManager: r,
		dev: e.dev ?? !1,
		workspace: e.workspace,
		global: e.global ?? !1,
		dry: e.dry ?? !1,
		corepack: e.corepack ?? !0
	};
}
function parsePackageManagerField(e) {
	let [t, n] = (e || ``).split(`@`), [r, i] = n?.split(`+`) || [];
	if (t && t !== `-` && /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/.test(t)) return {
		name: t,
		version: r,
		buildMeta: i
	};
	let a = (t || ``).replace(/\W+/g, ``);
	return {
		name: a,
		version: r,
		buildMeta: i,
		warnings: [`Abnormal characters found in \`packageManager\` field, sanitizing from \`${t}\` to \`${a}\``]
	};
}
const packageManagers = [
	{
		name: `npm`,
		command: `npm`,
		lockFile: `package-lock.json`
	},
	{
		name: `pnpm`,
		command: `pnpm`,
		lockFile: `pnpm-lock.yaml`,
		files: [`pnpm-workspace.yaml`]
	},
	{
		name: `bun`,
		command: `bun`,
		lockFile: [`bun.lockb`, `bun.lock`]
	},
	{
		name: `yarn`,
		command: `yarn`,
		lockFile: `yarn.lock`,
		files: [`.yarnrc.yml`]
	},
	{
		name: `deno`,
		command: `deno`,
		lockFile: `deno.lock`,
		files: [`deno.json`]
	}
];
async function detectPackageManager(e, r = {}) {
	let i = await findup(resolve$1(e || `.`), async (e) => {
		if (!r.ignorePackageJSON) {
			let r = join$1(e, `package.json`);
			if (existsSync(r)) {
				let e = JSON.parse(await readFile(r, `utf8`));
				if (e?.packageManager) {
					let { name: t, version: n = `0.0.0`, buildMeta: r, warnings: i } = parsePackageManagerField(e.packageManager);
					if (t) {
						let e = n.split(`.`)[0], a = packageManagers.find((n) => n.name === t && n.majorVersion === e) || packageManagers.find((e) => e.name === t);
						return {
							name: t,
							command: t,
							version: n,
							majorVersion: e,
							buildMeta: r,
							warnings: i,
							files: a?.files,
							lockFile: a?.lockFile
						};
					}
				}
			}
			if (existsSync(join$1(e, `deno.json`))) return packageManagers.find((e) => e.name === `deno`);
		}
		if (!r.ignoreLockFile) {
			for (let t of packageManagers) if ([t.lockFile, t.files].flat().filter(Boolean).some((t) => existsSync(resolve$1(e, t)))) return { ...t };
		}
	}, { includeParentDirs: r.includeParentDirs ?? !0 });
	if (!i && !r.ignoreArgv) {
		let e = process.argv[1];
		if (e) {
			for (let t of packageManagers) if (RegExp(`[/\\\\]\\.?${t.command}`).test(e)) return t;
		}
	}
	return i;
}
async function installDependencies(e = {}) {
	let t = await resolveOperationOptions(e), n = e.frozenLockFile ? {
		npm: [`ci`],
		yarn: [`install`, `--immutable`],
		bun: [`install`, `--frozen-lockfile`],
		pnpm: [`install`, `--frozen-lockfile`],
		deno: [`install`, `--frozen`]
	}[t.packageManager.name] : [`install`];
	return e.ignoreWorkspace && t.packageManager.name === `pnpm` && n.push(`--ignore-workspace`), t.dry || await executeCommand(t.packageManager.command, n, {
		cwd: t.cwd,
		silent: t.silent,
		corepack: t.corepack
	}), { exec: {
		command: t.packageManager.command,
		args: n
	} };
}
export { resolve$1 as a, relative as i, basename$1 as n, dirname$1 as r, dist_exports as t };
