import { parseArgs } from "node:util";
const NUMBER_CHAR_RE = /\d/, STR_SPLITTERS = [
	`-`,
	`_`,
	`/`,
	`.`
];
function isUppercase(e = ``) {
	if (!NUMBER_CHAR_RE.test(e)) return e !== e.toLowerCase();
}
function splitByCase(e, t) {
	let i = t ?? STR_SPLITTERS, a = [];
	if (!e || typeof e != `string`) return a;
	let o = ``, s, c;
	for (let t of e) {
		let e = i.includes(t);
		if (e === !0) {
			a.push(o), o = ``, s = void 0;
			continue;
		}
		let n = isUppercase(t);
		if (c === !1) {
			if (s === !1 && n === !0) {
				a.push(o), o = t, s = n;
				continue;
			}
			if (s === !0 && n === !1 && o.length > 1) {
				let e = o.at(-1);
				a.push(o.slice(0, Math.max(0, o.length - 1))), o = e + t, s = n;
				continue;
			}
		}
		o += t, s = n, c = e;
	}
	return a.push(o), a;
}
function upperFirst(e) {
	return e ? e[0].toUpperCase() + e.slice(1) : ``;
}
function lowerFirst(e) {
	return e ? e[0].toLowerCase() + e.slice(1) : ``;
}
function pascalCase(e, t) {
	return e ? (Array.isArray(e) ? e : splitByCase(e)).map((e) => upperFirst(t?.normalize ? e.toLowerCase() : e)).join(``) : ``;
}
function camelCase(e, t) {
	return lowerFirst(pascalCase(e || ``, t));
}
function kebabCase(e, t) {
	return e ? (Array.isArray(e) ? e : splitByCase(e)).map((e) => e.toLowerCase()).join(t ?? `-`) : ``;
}
function toArray(e) {
	return Array.isArray(e) ? e : e === void 0 ? [] : [e];
}
function formatLineColumns(e, t = ``) {
	let n = [];
	for (let t of e) for (let [e, r] of t.entries()) n[e] = Math.max(n[e] || 0, r.length);
	return e.map((e) => e.map((e, r) => t + e[r === 0 ? `padStart` : `padEnd`](n[r])).join(`  `)).join(`
`);
}
function resolveValue(e) {
	return typeof e == `function` ? e() : e;
}
var CLIError = class extends Error {
	code;
	constructor(e, t) {
		super(e), this.name = `CLIError`, this.code = t;
	}
};
function parseRawArgs(t = [], n = {}) {
	let r = new Set(n.boolean || []), i = new Set(n.string || []), a = n.alias || {}, o = n.default || {}, s = /* @__PURE__ */ new Map(), c = /* @__PURE__ */ new Map();
	for (let [e, t] of Object.entries(a)) {
		let n = t;
		for (let t of n) s.set(e, t), c.has(t) || c.set(t, []), c.get(t).push(e), s.set(t, e), c.has(e) || c.set(e, []), c.get(e).push(t);
	}
	let l = {};
	function u(e) {
		if (r.has(e)) return `boolean`;
		let t = c.get(e) || [];
		for (let e of t) if (r.has(e)) return `boolean`;
		return `string`;
	}
	let d = new Set([
		...r,
		...i,
		...Object.keys(a),
		...Object.values(a).flat(),
		...Object.keys(o)
	]);
	for (let e of d) l[e] || (l[e] = {
		type: u(e),
		default: o[e]
	});
	for (let [e, t] of s.entries()) e.length === 1 && l[t] && !l[t].short && (l[t].short = e);
	let f = [], p = {};
	for (let e = 0; e < t.length; e++) {
		let n = t[e];
		if (n === `--`) {
			f.push(...t.slice(e));
			break;
		}
		if (n.startsWith(`--no-`)) {
			let e = n.slice(5);
			p[e] = !0;
			continue;
		}
		f.push(n);
	}
	let m;
	try {
		m = parseArgs({
			args: f,
			options: Object.keys(l).length > 0 ? l : void 0,
			allowPositionals: !0,
			strict: !1
		});
	} catch {
		m = {
			values: {},
			positionals: f
		};
	}
	let h = { _: [] };
	h._ = m.positionals;
	for (let [e, t] of Object.entries(m.values)) h[e] = t;
	for (let [e] of Object.entries(p)) h[e] = !1;
	for (let [e, t] of s.entries()) h[e] !== void 0 && h[t] === void 0 && (h[t] = h[e]), h[t] !== void 0 && h[e] === void 0 && (h[e] = h[t]);
	return h;
}
const noColor = (() => {
	let e = globalThis.process?.env ?? {};
	return e.NO_COLOR === `1` || e.TERM === `dumb` || e.TEST || e.CI;
})(), _c = (e, t = 39) => (n) => noColor ? n : `\u001B[${e}m${n}\u001B[${t}m`, bold = _c(1, 22), cyan = _c(36), gray = _c(90), underline = _c(4, 24);
function parseArgs$1(e, t) {
	let n = {
		boolean: [],
		string: [],
		alias: {},
		default: {}
	}, r = resolveArgs(t);
	for (let e of r) {
		if (e.type === `positional`) continue;
		e.type === `string` || e.type === `enum` ? n.string.push(e.name) : e.type === `boolean` && n.boolean.push(e.name), e.default !== void 0 && (n.default[e.name] = e.default), e.alias && (n.alias[e.name] = e.alias);
		let t = camelCase(e.name), r = kebabCase(e.name);
		if (t !== e.name || r !== e.name) {
			let i = toArray(n.alias[e.name] || []);
			t !== e.name && !i.includes(t) && i.push(t), r !== e.name && !i.includes(r) && i.push(r), i.length > 0 && (n.alias[e.name] = i);
		}
	}
	let i = parseRawArgs(e, n), [ ...a] = i._, o = new Proxy(i, { get(e, t) {
		return e[t] ?? e[camelCase(t)] ?? e[kebabCase(t)];
	} });
	for (let [, e] of r.entries()) if (e.type === `positional`) {
		let t = a.shift();
		if (t !== void 0) o[e.name] = t;
		else if (e.default === void 0 && e.required !== !1) throw new CLIError(`Missing required positional argument: ${e.name.toUpperCase()}`, `EARG`);
		else o[e.name] = e.default;
	} else if (e.type === `enum`) {
		let t = o[e.name], n = e.options || [];
		if (t !== void 0 && n.length > 0 && !n.includes(t)) throw new CLIError(`Invalid value for argument: ${cyan(`--${e.name}`)} (${cyan(t)}). Expected one of: ${n.map((e) => cyan(e)).join(`, `)}.`, `EARG`);
	} else if (e.required && o[e.name] === void 0) throw new CLIError(`Missing required argument: --${e.name}`, `EARG`);
	return o;
}
function resolveArgs(e) {
	let t = [];
	for (let [n, r] of Object.entries(e || {})) t.push({
		...r,
		name: n,
		alias: toArray(r.alias)
	});
	return t;
}
function defineCommand(e) {
	return e;
}
async function runCommand(e, t) {
	let n = await resolveValue(e.args || {}), r = parseArgs$1(t.rawArgs, n), i = {
		rawArgs: t.rawArgs,
		args: r,
		data: t.data,
		cmd: e
	};
	typeof e.setup == `function` && await e.setup(i);
	let a;
	try {
		let n = await resolveValue(e.subCommands);
		if (n && Object.keys(n).length > 0) {
			let r = t.rawArgs.findIndex((e) => !e.startsWith(`-`)), i = t.rawArgs[r];
			if (i) {
				if (!n[i]) throw new CLIError(`Unknown command ${cyan(i)}`, `E_UNKNOWN_COMMAND`);
				let e = await resolveValue(n[i]);
				e && await runCommand(e, { rawArgs: t.rawArgs.slice(r + 1) });
			} else if (!e.run) throw new CLIError(`No command specified.`, `E_NO_COMMAND`);
		}
		typeof e.run == `function` && (a = await e.run(i));
	} finally {
		typeof e.cleanup == `function` && await e.cleanup(i);
	}
	return { result: a };
}
async function resolveSubCommand(e, t, n) {
	let r = await resolveValue(e.subCommands);
	if (r && Object.keys(r).length > 0) {
		let n = t.findIndex((e) => !e.startsWith(`-`)), i = t[n], a = await resolveValue(r[i]);
		if (a) return resolveSubCommand(a, t.slice(n + 1), e);
	}
	return [e, n];
}
async function showUsage(e, t) {
	try {
		console.log(await renderUsage(e, t) + `
`);
	} catch (e) {
		console.error(e);
	}
}
const negativePrefixRe = /^no[-A-Z]/;
async function renderUsage(e, t) {
	let n = await resolveValue(e.meta || {}), r = resolveArgs(await resolveValue(e.args || {})), i = await resolveValue(t?.meta || {}), a = `${i.name ? `${i.name} ` : ``}` + (n.name || process.argv[1]), o = [], s = [], c = [], l = [];
	for (let e of r) if (e.type === `positional`) {
		let t = e.name.toUpperCase(), n = e.required !== !1 && e.default === void 0, r = e.default ? `="${e.default}"` : ``;
		s.push([
			cyan(t + r),
			e.description || ``,
			e.valueHint ? `<${e.valueHint}>` : ``
		]), l.push(n ? `<${t}>` : `[${t}]`);
	} else {
		let t = e.required === !0 && e.default === void 0, n = [...(e.alias || []).map((e) => `-${e}`), `--${e.name}`].join(`, `) + (e.type === `string` && (e.valueHint || e.default) ? `=${e.valueHint ? `<${e.valueHint}>` : `"${e.default || ``}"`}` : ``) + (e.type === `enum` && e.options ? `=<${e.options.join(`|`)}>` : ``);
		if (o.push([cyan(n + (t ? ` (required)` : ``)), e.description || ``]), e.type === `boolean` && (e.default === !0 || e.negativeDescription) && !negativePrefixRe.test(e.name)) {
			let n = [...(e.alias || []).map((e) => `--no-${e}`), `--no-${e.name}`].join(`, `);
			o.push([cyan(n + (t ? ` (required)` : ``)), e.negativeDescription || ``]);
		}
		t && l.push(n);
	}
	if (e.subCommands) {
		let t = [], n = await resolveValue(e.subCommands);
		for (let [e, r] of Object.entries(n)) {
			let n = await resolveValue((await resolveValue(r))?.meta);
			n?.hidden || (c.push([cyan(e), n?.description || ``]), t.push(e));
		}
		l.push(t.join(`|`));
	}
	let u = [], p = n.version || i.version;
	u.push(gray(`${n.description} (${a + (p ? ` v${p}` : ``)})`), ``);
	let m = o.length > 0 || s.length > 0;
	return u.push(`${underline(bold(`USAGE`))} ${cyan(`${a}${m ? ` [OPTIONS]` : ``} ${l.join(` `)}`)}`, ``), s.length > 0 && (u.push(underline(bold(`ARGUMENTS`)), ``), u.push(formatLineColumns(s, `  `)), u.push(``)), o.length > 0 && (u.push(underline(bold(`OPTIONS`)), ``), u.push(formatLineColumns(o, `  `)), u.push(``)), c.length > 0 && (u.push(underline(bold(`COMMANDS`)), ``), u.push(formatLineColumns(c, `  `)), u.push(``, `Use ${cyan(`${a} <command> --help`)} for more information about a command.`)), u.filter((e) => typeof e == `string`).join(`
`);
}
async function runMain(e, t = {}) {
	let n = t.rawArgs || process.argv.slice(2), r = t.showUsage || showUsage;
	try {
		if (n.includes(`--help`) || n.includes(`-h`)) await r(...await resolveSubCommand(e, n)), process.exit(0);
		else if (n.length === 1 && n[0] === `--version`) {
			let t = typeof e.meta == `function` ? await e.meta() : await e.meta;
			if (!t?.version) throw new CLIError(`No version specified`, `E_NO_VERSION`);
			console.log(t.version);
		} else await runCommand(e, { rawArgs: n });
	} catch (t) {
		t instanceof CLIError ? (await r(...await resolveSubCommand(e, n)), console.error(t.message)) : console.error(t, `
`), process.exit(1);
	}
}
export { runMain as n, defineCommand as t };
