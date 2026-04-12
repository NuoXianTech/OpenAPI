import { t as __exportAll } from "../rolldown-runtime.mjs";
import { a as Minipass, i as WriteStreamSync, n as ReadStreamSync, r as WriteStream, t as ReadStream } from "./@isaacs/fs-minipass.mjs";
import { a as ZstdCompress, i as Unzip, n as BrotliDecompress, o as ZstdDecompress, r as Gzip, t as BrotliCompress } from "./minizlib.mjs";
import { n as chownrSync, t as chownr } from "./chownr.mjs";
import fsp from "node:fs/promises";
import fs from "node:fs";
import path, { basename, join, posix, win32 } from "node:path";
import { EventEmitter } from "events";
import fs$1 from "fs";
import path$1, { dirname as dirname$1, parse } from "path";
import assert from "node:assert";
import { randomBytes } from "node:crypto";
const argmap = new Map([
	[`C`, `cwd`],
	[`f`, `file`],
	[`z`, `gzip`],
	[`P`, `preservePaths`],
	[`U`, `unlink`],
	[`strip-components`, `strip`],
	[`stripComponents`, `strip`],
	[`keep-newer`, `newer`],
	[`keepNewer`, `newer`],
	[`keep-newer-files`, `newer`],
	[`keepNewerFiles`, `newer`],
	[`k`, `keep`],
	[`keep-existing`, `keep`],
	[`keepExisting`, `keep`],
	[`m`, `noMtime`],
	[`no-mtime`, `noMtime`],
	[`p`, `preserveOwner`],
	[`L`, `follow`],
	[`h`, `follow`],
	[`onentry`, `onReadEntry`]
]), isSyncFile = (e) => !!e.sync && !!e.file, isAsyncFile = (e) => !e.sync && !!e.file, isSyncNoFile = (e) => !!e.sync && !e.file, isAsyncNoFile = (e) => !e.sync && !e.file, isFile = (e) => !!e.file, dealiasKey = (e) => argmap.get(e) || e, dealias = (e = {}) => {
	if (!e) return {};
	let t = {};
	for (let [n, r] of Object.entries(e)) {
		let e = dealiasKey(n);
		t[e] = r;
	}
	return t.chmod === void 0 && t.noChmod === !1 && (t.chmod = !0), delete t.noChmod, t;
}, makeCommand = (e, t, n, r, i) => Object.assign((a = [], o, s) => {
	Array.isArray(a) && (o = a, a = {}), typeof o == `function` && (s = o, o = void 0), o = o ? Array.from(o) : [];
	let c = dealias(a);
	if (i?.(c, o), isSyncFile(c)) {
		if (typeof s == `function`) throw TypeError(`callback not supported for sync tar functions`);
		return e(c, o);
	} else if (isAsyncFile(c)) {
		let e = t(c, o), n = s || void 0;
		return n ? e.then(() => n(), n) : e;
	} else if (isSyncNoFile(c)) {
		if (typeof s == `function`) throw TypeError(`callback not supported for sync tar functions`);
		return n(c, o);
	} else if (isAsyncNoFile(c)) {
		if (typeof s == `function`) throw TypeError(`callback only supported with file option`);
		return r(c, o);
	} else throw Error(`impossible options??`);
}, {
	syncFile: e,
	asyncFile: t,
	syncNoFile: n,
	asyncNoFile: r,
	validate: i
}), encode$1 = (e, t) => {
	if (Number.isSafeInteger(e)) e < 0 ? encodeNegative(e, t) : encodePositive(e, t);
	else throw Error(`cannot encode number outside of javascript safe integer range`);
	return t;
}, encodePositive = (e, t) => {
	t[0] = 128;
	for (var n = t.length; n > 1; n--) t[n - 1] = e & 255, e = Math.floor(e / 256);
}, encodeNegative = (e, t) => {
	t[0] = 255;
	var n = !1;
	e *= -1;
	for (var r = t.length; r > 1; r--) {
		var i = e & 255;
		e = Math.floor(e / 256), n ? t[r - 1] = onesComp(i) : i === 0 ? t[r - 1] = 0 : (n = !0, t[r - 1] = twosComp(i));
	}
}, parse$2 = (e) => {
	let t = e[0], n = t === 128 ? pos(e.subarray(1, e.length)) : t === 255 ? twos(e) : null;
	if (n === null) throw Error(`invalid base256 encoding`);
	if (!Number.isSafeInteger(n)) throw Error(`parsed number outside of javascript safe integer range`);
	return n;
}, twos = (e) => {
	for (var t = e.length, n = 0, r = !1, i = t - 1; i > -1; i--) {
		var a = Number(e[i]), o;
		r ? o = onesComp(a) : a === 0 ? o = a : (r = !0, o = twosComp(a)), o !== 0 && (n -= o * 256 ** (t - i - 1));
	}
	return n;
}, pos = (e) => {
	for (var t = e.length, n = 0, r = t - 1; r > -1; r--) {
		var i = Number(e[r]);
		i !== 0 && (n += i * 256 ** (t - r - 1));
	}
	return n;
}, onesComp = (e) => (255 ^ e) & 255, twosComp = (e) => (255 ^ e) + 1 & 255, isCode = (e) => name.has(e), name = new Map([
	[`0`, `File`],
	[``, `OldFile`],
	[`1`, `Link`],
	[`2`, `SymbolicLink`],
	[`3`, `CharacterDevice`],
	[`4`, `BlockDevice`],
	[`5`, `Directory`],
	[`6`, `FIFO`],
	[`7`, `ContiguousFile`],
	[`g`, `GlobalExtendedHeader`],
	[`x`, `ExtendedHeader`],
	[`A`, `SolarisACL`],
	[`D`, `GNUDumpDir`],
	[`I`, `Inode`],
	[`K`, `NextFileHasLongLinkpath`],
	[`L`, `NextFileHasLongPath`],
	[`M`, `ContinuationFile`],
	[`N`, `OldGnuLongPath`],
	[`S`, `SparseFile`],
	[`V`, `TapeVolumeHeader`],
	[`X`, `OldExtendedHeader`]
]), code = new Map(Array.from(name).map((e) => [e[1], e[0]]));
var Header = class {
	cksumValid = !1;
	needPax = !1;
	nullBlock = !1;
	block;
	path;
	mode;
	uid;
	gid;
	size;
	cksum;
	#type = `Unsupported`;
	linkpath;
	uname;
	gname;
	devmaj = 0;
	devmin = 0;
	atime;
	ctime;
	mtime;
	charset;
	comment;
	constructor(e, t = 0, n, r) {
		Buffer.isBuffer(e) ? this.decode(e, t || 0, n, r) : e && this.#slurp(e);
	}
	decode(e, t, n, r) {
		if (t ||= 0, !e || !(e.length >= t + 512)) throw Error(`need 512 bytes for header`);
		this.path = n?.path ?? decString(e, t, 100), this.mode = n?.mode ?? r?.mode ?? decNumber(e, t + 100, 8), this.uid = n?.uid ?? r?.uid ?? decNumber(e, t + 108, 8), this.gid = n?.gid ?? r?.gid ?? decNumber(e, t + 116, 8), this.size = n?.size ?? r?.size ?? decNumber(e, t + 124, 12), this.mtime = n?.mtime ?? r?.mtime ?? decDate(e, t + 136, 12), this.cksum = decNumber(e, t + 148, 12), r && this.#slurp(r, !0), n && this.#slurp(n);
		let i = decString(e, t + 156, 1);
		if (isCode(i) && (this.#type = i || `0`), this.#type === `0` && this.path.slice(-1) === `/` && (this.#type = `5`), this.#type === `5` && (this.size = 0), this.linkpath = decString(e, t + 157, 100), e.subarray(t + 257, t + 265).toString() === `ustar\x0000`) if (this.uname = n?.uname ?? r?.uname ?? decString(e, t + 265, 32), this.gname = n?.gname ?? r?.gname ?? decString(e, t + 297, 32), this.devmaj = n?.devmaj ?? r?.devmaj ?? decNumber(e, t + 329, 8) ?? 0, this.devmin = n?.devmin ?? r?.devmin ?? decNumber(e, t + 337, 8) ?? 0, e[t + 475] !== 0) this.path = decString(e, t + 345, 155) + `/` + this.path;
		else {
			let i = decString(e, t + 345, 130);
			i && (this.path = i + `/` + this.path), this.atime = n?.atime ?? r?.atime ?? decDate(e, t + 476, 12), this.ctime = n?.ctime ?? r?.ctime ?? decDate(e, t + 488, 12);
		}
		let a = 256;
		for (let n = t; n < t + 148; n++) a += e[n];
		for (let n = t + 156; n < t + 512; n++) a += e[n];
		this.cksumValid = a === this.cksum, this.cksum === void 0 && a === 256 && (this.nullBlock = !0);
	}
	#slurp(e, t = !1) {
		Object.assign(this, Object.fromEntries(Object.entries(e).filter(([e, n]) => !(n == null || e === `path` && t || e === `linkpath` && t || e === `global`))));
	}
	encode(e, t = 0) {
		if (e ||= this.block = Buffer.alloc(512), this.#type === `Unsupported` && (this.#type = `0`), !(e.length >= t + 512)) throw Error(`need 512 bytes for header`);
		let n = this.ctime || this.atime ? 130 : 155, r = splitPrefix(this.path || ``, n), i = r[0], a = r[1];
		this.needPax = !!r[2], this.needPax = encString(e, t, 100, i) || this.needPax, this.needPax = encNumber(e, t + 100, 8, this.mode) || this.needPax, this.needPax = encNumber(e, t + 108, 8, this.uid) || this.needPax, this.needPax = encNumber(e, t + 116, 8, this.gid) || this.needPax, this.needPax = encNumber(e, t + 124, 12, this.size) || this.needPax, this.needPax = encDate(e, t + 136, 12, this.mtime) || this.needPax, e[t + 156] = this.#type.charCodeAt(0), this.needPax = encString(e, t + 157, 100, this.linkpath) || this.needPax, e.write(`ustar\x0000`, t + 257, 8), this.needPax = encString(e, t + 265, 32, this.uname) || this.needPax, this.needPax = encString(e, t + 297, 32, this.gname) || this.needPax, this.needPax = encNumber(e, t + 329, 8, this.devmaj) || this.needPax, this.needPax = encNumber(e, t + 337, 8, this.devmin) || this.needPax, this.needPax = encString(e, t + 345, n, a) || this.needPax, e[t + 475] === 0 ? (this.needPax = encString(e, t + 345, 130, a) || this.needPax, this.needPax = encDate(e, t + 476, 12, this.atime) || this.needPax, this.needPax = encDate(e, t + 488, 12, this.ctime) || this.needPax) : this.needPax = encString(e, t + 345, 155, a) || this.needPax;
		let o = 256;
		for (let n = t; n < t + 148; n++) o += e[n];
		for (let n = t + 156; n < t + 512; n++) o += e[n];
		return this.cksum = o, encNumber(e, t + 148, 8, this.cksum), this.cksumValid = !0, this.needPax;
	}
	get type() {
		return this.#type === `Unsupported` ? this.#type : name.get(this.#type);
	}
	get typeKey() {
		return this.#type;
	}
	set type(e) {
		let t = String(code.get(e));
		if (isCode(t) || t === `Unsupported`) this.#type = t;
		else if (isCode(e)) this.#type = e;
		else throw TypeError(`invalid entry type: ` + e);
	}
};
const splitPrefix = (e, t) => {
	let n = e, r = ``, i, a = posix.parse(e).root || `.`;
	if (Buffer.byteLength(n) < 100) i = [
		n,
		r,
		!1
	];
	else {
		r = posix.dirname(n), n = posix.basename(n);
		do
			Buffer.byteLength(n) <= 100 && Buffer.byteLength(r) <= t ? i = [
				n,
				r,
				!1
			] : Buffer.byteLength(n) > 100 && Buffer.byteLength(r) <= t ? i = [
				n.slice(0, 99),
				r,
				!0
			] : (n = posix.join(posix.basename(r), n), r = posix.dirname(r));
		while (r !== a && i === void 0);
		i ||= [
			e.slice(0, 99),
			``,
			!0
		];
	}
	return i;
}, decString = (e, t, n) => e.subarray(t, t + n).toString(`utf8`).replace(/\0.*/, ``), decDate = (e, t, n) => numToDate(decNumber(e, t, n)), numToDate = (e) => e === void 0 ? void 0 : /* @__PURE__ */ new Date(e * 1e3), decNumber = (e, t, n) => Number(e[t]) & 128 ? parse$2(e.subarray(t, t + n)) : decSmallNumber(e, t, n), nanUndef = (e) => isNaN(e) ? void 0 : e, decSmallNumber = (e, t, n) => nanUndef(parseInt(e.subarray(t, t + n).toString(`utf8`).replace(/\0.*$/, ``).trim(), 8)), MAXNUM = {
	12: 8589934591,
	8: 2097151
}, encNumber = (e, t, n, r) => r === void 0 ? !1 : r > MAXNUM[n] || r < 0 ? (encode$1(r, e.subarray(t, t + n)), !0) : (encSmallNumber(e, t, n, r), !1), encSmallNumber = (e, t, n, r) => e.write(octalString(r, n), t, n, `ascii`), octalString = (e, t) => padOctal(Math.floor(e).toString(8), t), padOctal = (e, t) => (e.length === t - 1 ? e : Array(t - e.length - 1).join(`0`) + e + ` `) + `\0`, encDate = (e, t, n, r) => r === void 0 ? !1 : encNumber(e, t, n, r.getTime() / 1e3), NULLS = Array(156).join(`\0`), encString = (e, t, n, r) => r === void 0 ? !1 : (e.write(r + NULLS, t, n, `utf8`), r.length !== Buffer.byteLength(r) || r.length > n);
var Pax = class e {
	atime;
	mtime;
	ctime;
	charset;
	comment;
	gid;
	uid;
	gname;
	uname;
	linkpath;
	dev;
	ino;
	nlink;
	path;
	size;
	mode;
	global;
	constructor(e, t = !1) {
		this.atime = e.atime, this.charset = e.charset, this.comment = e.comment, this.ctime = e.ctime, this.dev = e.dev, this.gid = e.gid, this.global = t, this.gname = e.gname, this.ino = e.ino, this.linkpath = e.linkpath, this.mtime = e.mtime, this.nlink = e.nlink, this.path = e.path, this.size = e.size, this.uid = e.uid, this.uname = e.uname;
	}
	encode() {
		let e = this.encodeBody();
		if (e === ``) return Buffer.allocUnsafe(0);
		let t = Buffer.byteLength(e), n = 512 * Math.ceil(1 + t / 512), r = Buffer.allocUnsafe(n);
		for (let e = 0; e < 512; e++) r[e] = 0;
		new Header({
			path: (`PaxHeader/` + basename(this.path ?? ``)).slice(0, 99),
			mode: this.mode || 420,
			uid: this.uid,
			gid: this.gid,
			size: t,
			mtime: this.mtime,
			type: this.global ? `GlobalExtendedHeader` : `ExtendedHeader`,
			linkpath: ``,
			uname: this.uname || ``,
			gname: this.gname || ``,
			devmaj: 0,
			devmin: 0,
			atime: this.atime,
			ctime: this.ctime
		}).encode(r), r.write(e, 512, t, `utf8`);
		for (let e = t + 512; e < r.length; e++) r[e] = 0;
		return r;
	}
	encodeBody() {
		return this.encodeField(`path`) + this.encodeField(`ctime`) + this.encodeField(`atime`) + this.encodeField(`dev`) + this.encodeField(`ino`) + this.encodeField(`nlink`) + this.encodeField(`charset`) + this.encodeField(`comment`) + this.encodeField(`gid`) + this.encodeField(`gname`) + this.encodeField(`linkpath`) + this.encodeField(`mtime`) + this.encodeField(`size`) + this.encodeField(`uid`) + this.encodeField(`uname`);
	}
	encodeField(e) {
		if (this[e] === void 0) return ``;
		let t = this[e], n = t instanceof Date ? t.getTime() / 1e3 : t, r = ` ` + (e === `dev` || e === `ino` || e === `nlink` ? `SCHILY.` : ``) + e + `=` + n + `
`, i = Buffer.byteLength(r), a = Math.floor(Math.log(i) / Math.log(10)) + 1;
		return i + a >= 10 ** a && (a += 1), a + i + r;
	}
	static parse(t, n, r = !1) {
		return new e(merge(parseKV(t), n), r);
	}
};
const merge = (e, t) => t ? Object.assign({}, t, e) : e, parseKV = (e) => e.replace(/\n$/, ``).split(`
`).reduce(parseKVLine, Object.create(null)), parseKVLine = (e, t) => {
	let n = parseInt(t, 10);
	if (n !== Buffer.byteLength(t) + 1) return e;
	t = t.slice((n + ` `).length);
	let r = t.split(`=`), i = r.shift();
	if (!i) return e;
	let a = i.replace(/^SCHILY\.(dev|ino|nlink)/, `$1`), o = r.join(`=`);
	return e[a] = /^([A-Z]+\.)?([mac]|birth|creation)time$/.test(a) ? /* @__PURE__ */ new Date(Number(o) * 1e3) : /^[0-9]+$/.test(o) ? +o : o, e;
}, normalizeWindowsPath = (process.env.TESTING_TAR_FAKE_PLATFORM || process.platform) === `win32` ? (e) => e && e.replace(/\\/g, `/`) : (e) => e;
var ReadEntry = class extends Minipass {
	extended;
	globalExtended;
	header;
	startBlockSize;
	blockRemain;
	remain;
	type;
	meta = !1;
	ignore = !1;
	path;
	mode;
	uid;
	gid;
	uname;
	gname;
	size = 0;
	mtime;
	atime;
	ctime;
	linkpath;
	dev;
	ino;
	nlink;
	invalid = !1;
	absolute;
	unsupported = !1;
	constructor(e, t, n) {
		switch (super({}), this.pause(), this.extended = t, this.globalExtended = n, this.header = e, this.remain = e.size ?? 0, this.startBlockSize = 512 * Math.ceil(this.remain / 512), this.blockRemain = this.startBlockSize, this.type = e.type, this.type) {
			case `File`:
			case `OldFile`:
			case `Link`:
			case `SymbolicLink`:
			case `CharacterDevice`:
			case `BlockDevice`:
			case `Directory`:
			case `FIFO`:
			case `ContiguousFile`:
			case `GNUDumpDir`: break;
			case `NextFileHasLongLinkpath`:
			case `NextFileHasLongPath`:
			case `OldGnuLongPath`:
			case `GlobalExtendedHeader`:
			case `ExtendedHeader`:
			case `OldExtendedHeader`:
				this.meta = !0;
				break;
			default: this.ignore = !0;
		}
		if (!e.path) throw Error(`no path provided for tar.ReadEntry`);
		this.path = normalizeWindowsPath(e.path), this.mode = e.mode, this.mode && (this.mode &= 4095), this.uid = e.uid, this.gid = e.gid, this.uname = e.uname, this.gname = e.gname, this.size = this.remain, this.mtime = e.mtime, this.atime = e.atime, this.ctime = e.ctime, this.linkpath = e.linkpath ? normalizeWindowsPath(e.linkpath) : void 0, this.uname = e.uname, this.gname = e.gname, t && this.#slurp(t), n && this.#slurp(n, !0);
	}
	write(e) {
		let t = e.length;
		if (t > this.blockRemain) throw Error(`writing more to entry than is appropriate`);
		let n = this.remain, r = this.blockRemain;
		return this.remain = Math.max(0, n - t), this.blockRemain = Math.max(0, r - t), this.ignore ? !0 : n >= t ? super.write(e) : super.write(e.subarray(0, n));
	}
	#slurp(e, t = !1) {
		e.path &&= normalizeWindowsPath(e.path), e.linkpath &&= normalizeWindowsPath(e.linkpath), Object.assign(this, Object.fromEntries(Object.entries(e).filter(([e, n]) => !(n == null || e === `path` && t))));
	}
};
const warnMethod = (e, t, n, r = {}) => {
	e.file && (r.file = e.file), e.cwd && (r.cwd = e.cwd), r.code = n instanceof Error && n.code || t, r.tarCode = t, !e.strict && r.recoverable !== !1 ? (n instanceof Error && (r = Object.assign(n, r), n = n.message), e.emit(`warn`, t, n, r)) : n instanceof Error ? e.emit(`error`, Object.assign(n, r)) : e.emit(`error`, Object.assign(Error(`${t}: ${n}`), r));
}, gzipHeader = Buffer.from([31, 139]), zstdHeader = Buffer.from([
	40,
	181,
	47,
	253
]), ZIP_HEADER_LEN = Math.max(gzipHeader.length, zstdHeader.length), STATE = Symbol(`state`), WRITEENTRY = Symbol(`writeEntry`), READENTRY = Symbol(`readEntry`), NEXTENTRY = Symbol(`nextEntry`), PROCESSENTRY = Symbol(`processEntry`), EX = Symbol(`extendedHeader`), GEX = Symbol(`globalExtendedHeader`), META = Symbol(`meta`), EMITMETA = Symbol(`emitMeta`), BUFFER = Symbol(`buffer`), QUEUE$1 = Symbol(`queue`), ENDED$2 = Symbol(`ended`), EMITTEDEND = Symbol(`emittedEnd`), EMIT = Symbol(`emit`), UNZIP = Symbol(`unzip`), CONSUMECHUNK = Symbol(`consumeChunk`), CONSUMECHUNKSUB = Symbol(`consumeChunkSub`), CONSUMEBODY = Symbol(`consumeBody`), CONSUMEMETA = Symbol(`consumeMeta`), CONSUMEHEADER = Symbol(`consumeHeader`), CONSUMING = Symbol(`consuming`), BUFFERCONCAT = Symbol(`bufferConcat`), MAYBEEND = Symbol(`maybeEnd`), WRITING = Symbol(`writing`), ABORTED = Symbol(`aborted`), DONE = Symbol(`onDone`), SAW_VALID_ENTRY = Symbol(`sawValidEntry`), SAW_NULL_BLOCK = Symbol(`sawNullBlock`), SAW_EOF = Symbol(`sawEOF`), CLOSESTREAM = Symbol(`closeStream`), noop = () => !0;
var Parser = class extends EventEmitter {
	file;
	strict;
	maxMetaEntrySize;
	filter;
	brotli;
	zstd;
	writable = !0;
	readable = !1;
	[QUEUE$1] = [];
	[BUFFER];
	[READENTRY];
	[WRITEENTRY];
	[STATE] = `begin`;
	[META] = ``;
	[EX];
	[GEX];
	[ENDED$2] = !1;
	[UNZIP];
	[ABORTED] = !1;
	[SAW_VALID_ENTRY];
	[SAW_NULL_BLOCK] = !1;
	[SAW_EOF] = !1;
	[WRITING] = !1;
	[CONSUMING] = !1;
	[EMITTEDEND] = !1;
	constructor(e = {}) {
		super(), this.file = e.file || ``, this.on(DONE, () => {
			(this[STATE] === `begin` || this[SAW_VALID_ENTRY] === !1) && this.warn(`TAR_BAD_ARCHIVE`, `Unrecognized archive format`);
		}), e.ondone ? this.on(DONE, e.ondone) : this.on(DONE, () => {
			this.emit(`prefinish`), this.emit(`finish`), this.emit(`end`);
		}), this.strict = !!e.strict, this.maxMetaEntrySize = e.maxMetaEntrySize || 1048576, this.filter = typeof e.filter == `function` ? e.filter : noop;
		let t = e.file && (e.file.endsWith(`.tar.br`) || e.file.endsWith(`.tbr`));
		this.brotli = !(e.gzip || e.zstd) && e.brotli !== void 0 ? e.brotli : t ? void 0 : !1;
		let n = e.file && (e.file.endsWith(`.tar.zst`) || e.file.endsWith(`.tzst`));
		this.zstd = !(e.gzip || e.brotli) && e.zstd !== void 0 ? e.zstd : n ? !0 : void 0, this.on(`end`, () => this[CLOSESTREAM]()), typeof e.onwarn == `function` && this.on(`warn`, e.onwarn), typeof e.onReadEntry == `function` && this.on(`entry`, e.onReadEntry);
	}
	warn(e, t, n = {}) {
		warnMethod(this, e, t, n);
	}
	[CONSUMEHEADER](e, t) {
		this[SAW_VALID_ENTRY] === void 0 && (this[SAW_VALID_ENTRY] = !1);
		let n;
		try {
			n = new Header(e, t, this[EX], this[GEX]);
		} catch (e) {
			return this.warn(`TAR_ENTRY_INVALID`, e);
		}
		if (n.nullBlock) this[SAW_NULL_BLOCK] ? (this[SAW_EOF] = !0, this[STATE] === `begin` && (this[STATE] = `header`), this[EMIT](`eof`)) : (this[SAW_NULL_BLOCK] = !0, this[EMIT](`nullBlock`));
		else if (this[SAW_NULL_BLOCK] = !1, !n.cksumValid) this.warn(`TAR_ENTRY_INVALID`, `checksum failure`, { header: n });
		else if (!n.path) this.warn(`TAR_ENTRY_INVALID`, `path is required`, { header: n });
		else {
			let e = n.type;
			if (/^(Symbolic)?Link$/.test(e) && !n.linkpath) this.warn(`TAR_ENTRY_INVALID`, `linkpath required`, { header: n });
			else if (!/^(Symbolic)?Link$/.test(e) && !/^(Global)?ExtendedHeader$/.test(e) && n.linkpath) this.warn(`TAR_ENTRY_INVALID`, `linkpath forbidden`, { header: n });
			else {
				let e = this[WRITEENTRY] = new ReadEntry(n, this[EX], this[GEX]);
				this[SAW_VALID_ENTRY] || (e.remain ? e.on(`end`, () => {
					e.invalid || (this[SAW_VALID_ENTRY] = !0);
				}) : this[SAW_VALID_ENTRY] = !0), e.meta ? e.size > this.maxMetaEntrySize ? (e.ignore = !0, this[EMIT](`ignoredEntry`, e), this[STATE] = `ignore`, e.resume()) : e.size > 0 && (this[META] = ``, e.on(`data`, (e) => this[META] += e), this[STATE] = `meta`) : (this[EX] = void 0, e.ignore = e.ignore || !this.filter(e.path, e), e.ignore ? (this[EMIT](`ignoredEntry`, e), this[STATE] = e.remain ? `ignore` : `header`, e.resume()) : (e.remain ? this[STATE] = `body` : (this[STATE] = `header`, e.end()), this[READENTRY] ? this[QUEUE$1].push(e) : (this[QUEUE$1].push(e), this[NEXTENTRY]())));
			}
		}
	}
	[CLOSESTREAM]() {
		queueMicrotask(() => this.emit(`close`));
	}
	[PROCESSENTRY](e) {
		let t = !0;
		if (!e) this[READENTRY] = void 0, t = !1;
		else if (Array.isArray(e)) {
			let [t, ...n] = e;
			this.emit(t, ...n);
		} else this[READENTRY] = e, this.emit(`entry`, e), e.emittedEnd || (e.on(`end`, () => this[NEXTENTRY]()), t = !1);
		return t;
	}
	[NEXTENTRY]() {
		do		;
while (this[PROCESSENTRY](this[QUEUE$1].shift()));
		if (!this[QUEUE$1].length) {
			let e = this[READENTRY];
			!e || e.flowing || e.size === e.remain ? this[WRITING] || this.emit(`drain`) : e.once(`drain`, () => this.emit(`drain`));
		}
	}
	[CONSUMEBODY](e, t) {
		let n = this[WRITEENTRY];
		if (!n) throw Error(`attempt to consume body without entry??`);
		let r = n.blockRemain ?? 0, i = r >= e.length && t === 0 ? e : e.subarray(t, t + r);
		return n.write(i), n.blockRemain || (this[STATE] = `header`, this[WRITEENTRY] = void 0, n.end()), i.length;
	}
	[CONSUMEMETA](e, t) {
		let n = this[WRITEENTRY], r = this[CONSUMEBODY](e, t);
		return !this[WRITEENTRY] && n && this[EMITMETA](n), r;
	}
	[EMIT](e, t, n) {
		!this[QUEUE$1].length && !this[READENTRY] ? this.emit(e, t, n) : this[QUEUE$1].push([
			e,
			t,
			n
		]);
	}
	[EMITMETA](e) {
		switch (this[EMIT](`meta`, this[META]), e.type) {
			case `ExtendedHeader`:
			case `OldExtendedHeader`:
				this[EX] = Pax.parse(this[META], this[EX], !1);
				break;
			case `GlobalExtendedHeader`:
				this[GEX] = Pax.parse(this[META], this[GEX], !0);
				break;
			case `NextFileHasLongPath`:
			case `OldGnuLongPath`: {
				let e = this[EX] ?? Object.create(null);
				this[EX] = e, e.path = this[META].replace(/\0.*/, ``);
				break;
			}
			case `NextFileHasLongLinkpath`: {
				let e = this[EX] || Object.create(null);
				this[EX] = e, e.linkpath = this[META].replace(/\0.*/, ``);
				break;
			}
			default: throw Error(`unknown meta: ` + e.type);
		}
	}
	abort(e) {
		this[ABORTED] = !0, this.emit(`abort`, e), this.warn(`TAR_ABORT`, e, { recoverable: !1 });
	}
	write(e, t, n) {
		if (typeof t == `function` && (n = t, t = void 0), typeof e == `string` && (e = Buffer.from(e, typeof t == `string` ? t : `utf8`)), this[ABORTED]) return n?.(), !1;
		if ((this[UNZIP] === void 0 || this.brotli === void 0 && this[UNZIP] === !1) && e) {
			if (this[BUFFER] && (e = Buffer.concat([this[BUFFER], e]), this[BUFFER] = void 0), e.length < ZIP_HEADER_LEN) return this[BUFFER] = e, n?.(), !0;
			for (let t = 0; this[UNZIP] === void 0 && t < gzipHeader.length; t++) e[t] !== gzipHeader[t] && (this[UNZIP] = !1);
			let t = !1;
			if (this[UNZIP] === !1 && this.zstd !== !1) {
				t = !0;
				for (let n = 0; n < zstdHeader.length; n++) if (e[n] !== zstdHeader[n]) {
					t = !1;
					break;
				}
			}
			let r = this.brotli === void 0 && !t;
			if (this[UNZIP] === !1 && r) if (e.length < 512) if (this[ENDED$2]) this.brotli = !0;
			else return this[BUFFER] = e, n?.(), !0;
			else try {
				new Header(e.subarray(0, 512)), this.brotli = !1;
			} catch {
				this.brotli = !0;
			}
			if (this[UNZIP] === void 0 || this[UNZIP] === !1 && (this.brotli || t)) {
				let r = this[ENDED$2];
				this[ENDED$2] = !1, this[UNZIP] = this[UNZIP] === void 0 ? new Unzip({}) : t ? new ZstdDecompress({}) : new BrotliDecompress({}), this[UNZIP].on(`data`, (e) => this[CONSUMECHUNK](e)), this[UNZIP].on(`error`, (e) => this.abort(e)), this[UNZIP].on(`end`, () => {
					this[ENDED$2] = !0, this[CONSUMECHUNK]();
				}), this[WRITING] = !0;
				let i = !!this[UNZIP][r ? `end` : `write`](e);
				return this[WRITING] = !1, n?.(), i;
			}
		}
		this[WRITING] = !0, this[UNZIP] ? this[UNZIP].write(e) : this[CONSUMECHUNK](e), this[WRITING] = !1;
		let r = this[QUEUE$1].length ? !1 : this[READENTRY] ? this[READENTRY].flowing : !0;
		return !r && !this[QUEUE$1].length && this[READENTRY]?.once(`drain`, () => this.emit(`drain`)), n?.(), r;
	}
	[BUFFERCONCAT](e) {
		e && !this[ABORTED] && (this[BUFFER] = this[BUFFER] ? Buffer.concat([this[BUFFER], e]) : e);
	}
	[MAYBEEND]() {
		if (this[ENDED$2] && !this[EMITTEDEND] && !this[ABORTED] && !this[CONSUMING]) {
			this[EMITTEDEND] = !0;
			let e = this[WRITEENTRY];
			if (e && e.blockRemain) {
				let t = this[BUFFER] ? this[BUFFER].length : 0;
				this.warn(`TAR_BAD_ARCHIVE`, `Truncated input (needed ${e.blockRemain} more bytes, only ${t} available)`, { entry: e }), this[BUFFER] && e.write(this[BUFFER]), e.end();
			}
			this[EMIT](DONE);
		}
	}
	[CONSUMECHUNK](e) {
		if (this[CONSUMING] && e) this[BUFFERCONCAT](e);
		else if (!e && !this[BUFFER]) this[MAYBEEND]();
		else if (e) {
			if (this[CONSUMING] = !0, this[BUFFER]) {
				this[BUFFERCONCAT](e);
				let t = this[BUFFER];
				this[BUFFER] = void 0, this[CONSUMECHUNKSUB](t);
			} else this[CONSUMECHUNKSUB](e);
			for (; this[BUFFER] && this[BUFFER]?.length >= 512 && !this[ABORTED] && !this[SAW_EOF];) {
				let e = this[BUFFER];
				this[BUFFER] = void 0, this[CONSUMECHUNKSUB](e);
			}
			this[CONSUMING] = !1;
		}
		(!this[BUFFER] || this[ENDED$2]) && this[MAYBEEND]();
	}
	[CONSUMECHUNKSUB](e) {
		let t = 0, n = e.length;
		for (; t + 512 <= n && !this[ABORTED] && !this[SAW_EOF];) switch (this[STATE]) {
			case `begin`:
			case `header`:
				this[CONSUMEHEADER](e, t), t += 512;
				break;
			case `ignore`:
			case `body`:
				t += this[CONSUMEBODY](e, t);
				break;
			case `meta`:
				t += this[CONSUMEMETA](e, t);
				break;
			default: throw Error(`invalid state: ` + this[STATE]);
		}
		t < n && (this[BUFFER] ? this[BUFFER] = Buffer.concat([e.subarray(t), this[BUFFER]]) : this[BUFFER] = e.subarray(t));
	}
	end(e, t, n) {
		return typeof e == `function` && (n = e, t = void 0, e = void 0), typeof t == `function` && (n = t, t = void 0), typeof e == `string` && (e = Buffer.from(e, t)), n && this.once(`finish`, n), this[ABORTED] || (this[UNZIP] ? (e && this[UNZIP].write(e), this[UNZIP].end()) : (this[ENDED$2] = !0, (this.brotli === void 0 || this.zstd === void 0) && (e ||= Buffer.alloc(0)), e && this.write(e), this[MAYBEEND]())), this;
	}
};
const stripTrailingSlashes = (e) => {
	let t = e.length - 1, n = -1;
	for (; t > -1 && e.charAt(t) === `/`;) n = t, t--;
	return n === -1 ? e : e.slice(0, n);
}, onReadEntryFunction = (e) => {
	let t = e.onReadEntry;
	e.onReadEntry = t ? (e) => {
		t(e), e.resume();
	} : (e) => e.resume();
}, filesFilter = (e, t) => {
	let n = new Map(t.map((e) => [stripTrailingSlashes(e), !0])), r = e.filter, i = (e, t = ``) => {
		let r = t || parse(e).root || `.`, a;
		if (e === r) a = !1;
		else {
			let t = n.get(e);
			a = t === void 0 ? i(dirname$1(e), r) : t;
		}
		return n.set(e, a), a;
	};
	e.filter = r ? (e, t) => r(e, t) && i(stripTrailingSlashes(e)) : (e) => i(stripTrailingSlashes(e));
}, list = makeCommand((e) => {
	let t = new Parser(e), n = e.file, r;
	try {
		r = fs.openSync(n, `r`);
		let i = fs.fstatSync(r), a = e.maxReadSize || 16 * 1024 * 1024;
		if (i.size < a) {
			let e = Buffer.allocUnsafe(i.size), n = fs.readSync(r, e, 0, i.size, 0);
			t.end(n === e.byteLength ? e : e.subarray(0, n));
		} else {
			let e = 0, n = Buffer.allocUnsafe(a);
			for (; e < i.size;) {
				let i = fs.readSync(r, n, 0, a, e);
				if (i === 0) break;
				e += i, t.write(n.subarray(0, i));
			}
			t.end();
		}
	} finally {
		if (typeof r == `number`) try {
			fs.closeSync(r);
		} catch {}
	}
}, (e, t) => {
	let n = new Parser(e), r = e.maxReadSize || 16 * 1024 * 1024, i = e.file;
	return new Promise((e, t) => {
		n.on(`error`, t), n.on(`end`, e), fs.stat(i, (e, o) => {
			if (e) t(e);
			else {
				let e = new ReadStream(i, {
					readSize: r,
					size: o.size
				});
				e.on(`error`, t), e.pipe(n);
			}
		});
	});
}, (e) => new Parser(e), (e) => new Parser(e), (e, t) => {
	t?.length && filesFilter(e, t), e.noResume || onReadEntryFunction(e);
}), modeFix = (e, t, n) => (e &= 4095, n && (e = (e | 384) & -19), t && (e & 256 && (e |= 64), e & 32 && (e |= 8), e & 4 && (e |= 1)), e), { isAbsolute, parse: parse$1 } = win32, stripAbsolutePath = (e) => {
	let t = ``, n = parse$1(e);
	for (; isAbsolute(e) || n.root;) {
		let r = e.charAt(0) === `/` && e.slice(0, 4) !== `//?/` ? `/` : n.root;
		e = e.slice(r.length), t += r, n = parse$1(e);
	}
	return [t, e];
}, raw = [
	`|`,
	`<`,
	`>`,
	`?`,
	`:`
], win = raw.map((e) => String.fromCharCode(61440 + e.charCodeAt(0))), toWin = new Map(raw.map((e, t) => [e, win[t]])), toRaw = new Map(win.map((e, t) => [e, raw[t]])), encode = (e) => raw.reduce((e, t) => e.split(t).join(toWin.get(t)), e), decode = (e) => win.reduce((e, t) => e.split(t).join(toRaw.get(t)), e), prefixPath = (e, t) => t ? (e = normalizeWindowsPath(e).replace(/^\.(\/|$)/, ``), stripTrailingSlashes(t) + `/` + e) : normalizeWindowsPath(e), PROCESS$1 = Symbol(`process`), FILE$1 = Symbol(`file`), DIRECTORY$1 = Symbol(`directory`), SYMLINK$1 = Symbol(`symlink`), HARDLINK$1 = Symbol(`hardlink`), HEADER = Symbol(`header`), READ = Symbol(`read`), LSTAT = Symbol(`lstat`), ONLSTAT = Symbol(`onlstat`), ONREAD = Symbol(`onread`), ONREADLINK = Symbol(`onreadlink`), OPENFILE = Symbol(`openfile`), ONOPENFILE = Symbol(`onopenfile`), CLOSE = Symbol(`close`), MODE = Symbol(`mode`), AWAITDRAIN = Symbol(`awaitDrain`), ONDRAIN$1 = Symbol(`ondrain`), PREFIX = Symbol(`prefix`);
var WriteEntry = class extends Minipass {
	path;
	portable;
	myuid = process.getuid && process.getuid() || 0;
	myuser = process.env.USER || ``;
	maxReadSize;
	linkCache;
	statCache;
	preservePaths;
	cwd;
	strict;
	mtime;
	noPax;
	noMtime;
	prefix;
	fd;
	blockLen = 0;
	blockRemain = 0;
	buf;
	pos = 0;
	remain = 0;
	length = 0;
	offset = 0;
	win32;
	absolute;
	header;
	type;
	linkpath;
	stat;
	onWriteEntry;
	#hadError = !1;
	constructor(e, t = {}) {
		let n = dealias(t);
		super(), this.path = normalizeWindowsPath(e), this.portable = !!n.portable, this.maxReadSize = n.maxReadSize || 16777216, this.linkCache = n.linkCache || /* @__PURE__ */ new Map(), this.statCache = n.statCache || /* @__PURE__ */ new Map(), this.preservePaths = !!n.preservePaths, this.cwd = normalizeWindowsPath(n.cwd || process.cwd()), this.strict = !!n.strict, this.noPax = !!n.noPax, this.noMtime = !!n.noMtime, this.mtime = n.mtime, this.prefix = n.prefix ? normalizeWindowsPath(n.prefix) : void 0, this.onWriteEntry = n.onWriteEntry, typeof n.onwarn == `function` && this.on(`warn`, n.onwarn);
		let r = !1;
		if (!this.preservePaths) {
			let [e, t] = stripAbsolutePath(this.path);
			e && typeof t == `string` && (this.path = t, r = e);
		}
		this.win32 = !!n.win32 || process.platform === `win32`, this.win32 && (this.path = decode(this.path.replace(/\\/g, `/`)), e = e.replace(/\\/g, `/`)), this.absolute = normalizeWindowsPath(n.absolute || path$1.resolve(this.cwd, e)), this.path === `` && (this.path = `./`), r && this.warn(`TAR_ENTRY_INFO`, `stripping ${r} from absolute path`, {
			entry: this,
			path: r + this.path
		});
		let i = this.statCache.get(this.absolute);
		i ? this[ONLSTAT](i) : this[LSTAT]();
	}
	warn(e, t, n = {}) {
		return warnMethod(this, e, t, n);
	}
	emit(e, ...t) {
		return e === `error` && (this.#hadError = !0), super.emit(e, ...t);
	}
	[LSTAT]() {
		fs$1.lstat(this.absolute, (e, t) => {
			if (e) return this.emit(`error`, e);
			this[ONLSTAT](t);
		});
	}
	[ONLSTAT](e) {
		this.statCache.set(this.absolute, e), this.stat = e, e.isFile() || (e.size = 0), this.type = getType(e), this.emit(`stat`, e), this[PROCESS$1]();
	}
	[PROCESS$1]() {
		switch (this.type) {
			case `File`: return this[FILE$1]();
			case `Directory`: return this[DIRECTORY$1]();
			case `SymbolicLink`: return this[SYMLINK$1]();
			default: return this.end();
		}
	}
	[MODE](e) {
		return modeFix(e, this.type === `Directory`, this.portable);
	}
	[PREFIX](e) {
		return prefixPath(e, this.prefix);
	}
	[HEADER]() {
		if (!this.stat) throw Error(`cannot write header before stat`);
		this.type === `Directory` && this.portable && (this.noMtime = !0), this.onWriteEntry?.(this), this.header = new Header({
			path: this[PREFIX](this.path),
			linkpath: this.type === `Link` && this.linkpath !== void 0 ? this[PREFIX](this.linkpath) : this.linkpath,
			mode: this[MODE](this.stat.mode),
			uid: this.portable ? void 0 : this.stat.uid,
			gid: this.portable ? void 0 : this.stat.gid,
			size: this.stat.size,
			mtime: this.noMtime ? void 0 : this.mtime || this.stat.mtime,
			type: this.type === `Unsupported` ? void 0 : this.type,
			uname: this.portable ? void 0 : this.stat.uid === this.myuid ? this.myuser : ``,
			atime: this.portable ? void 0 : this.stat.atime,
			ctime: this.portable ? void 0 : this.stat.ctime
		}), this.header.encode() && !this.noPax && super.write(new Pax({
			atime: this.portable ? void 0 : this.header.atime,
			ctime: this.portable ? void 0 : this.header.ctime,
			gid: this.portable ? void 0 : this.header.gid,
			mtime: this.noMtime ? void 0 : this.mtime || this.header.mtime,
			path: this[PREFIX](this.path),
			linkpath: this.type === `Link` && this.linkpath !== void 0 ? this[PREFIX](this.linkpath) : this.linkpath,
			size: this.header.size,
			uid: this.portable ? void 0 : this.header.uid,
			uname: this.portable ? void 0 : this.header.uname,
			dev: this.portable ? void 0 : this.stat.dev,
			ino: this.portable ? void 0 : this.stat.ino,
			nlink: this.portable ? void 0 : this.stat.nlink
		}).encode());
		let e = this.header?.block;
		if (!e) throw Error(`failed to encode header`);
		super.write(e);
	}
	[DIRECTORY$1]() {
		if (!this.stat) throw Error(`cannot create directory entry without stat`);
		this.path.slice(-1) !== `/` && (this.path += `/`), this.stat.size = 0, this[HEADER](), this.end();
	}
	[SYMLINK$1]() {
		fs$1.readlink(this.absolute, (e, t) => {
			if (e) return this.emit(`error`, e);
			this[ONREADLINK](t);
		});
	}
	[ONREADLINK](e) {
		this.linkpath = normalizeWindowsPath(e), this[HEADER](), this.end();
	}
	[HARDLINK$1](e) {
		if (!this.stat) throw Error(`cannot create link entry without stat`);
		this.type = `Link`, this.linkpath = normalizeWindowsPath(path$1.relative(this.cwd, e)), this.stat.size = 0, this[HEADER](), this.end();
	}
	[FILE$1]() {
		if (!this.stat) throw Error(`cannot create file entry without stat`);
		if (this.stat.nlink > 1) {
			let e = `${this.stat.dev}:${this.stat.ino}`, t = this.linkCache.get(e);
			if (t?.indexOf(this.cwd) === 0) return this[HARDLINK$1](t);
			this.linkCache.set(e, this.absolute);
		}
		if (this[HEADER](), this.stat.size === 0) return this.end();
		this[OPENFILE]();
	}
	[OPENFILE]() {
		fs$1.open(this.absolute, `r`, (e, t) => {
			if (e) return this.emit(`error`, e);
			this[ONOPENFILE](t);
		});
	}
	[ONOPENFILE](e) {
		if (this.fd = e, this.#hadError) return this[CLOSE]();
		if (!this.stat) throw Error(`should stat before calling onopenfile`);
		this.blockLen = 512 * Math.ceil(this.stat.size / 512), this.blockRemain = this.blockLen;
		let t = Math.min(this.blockLen, this.maxReadSize);
		this.buf = Buffer.allocUnsafe(t), this.offset = 0, this.pos = 0, this.remain = this.stat.size, this.length = this.buf.length, this[READ]();
	}
	[READ]() {
		let { fd: e, buf: t, offset: n, length: r, pos: i } = this;
		if (e === void 0 || t === void 0) throw Error(`cannot read file without first opening`);
		fs$1.read(e, t, n, r, i, (e, t) => {
			if (e) return this[CLOSE](() => this.emit(`error`, e));
			this[ONREAD](t);
		});
	}
	[CLOSE](e = () => {}) {
		this.fd !== void 0 && fs$1.close(this.fd, e);
	}
	[ONREAD](e) {
		if (e <= 0 && this.remain > 0) {
			let e = Object.assign(Error(`encountered unexpected EOF`), {
				path: this.absolute,
				syscall: `read`,
				code: `EOF`
			});
			return this[CLOSE](() => this.emit(`error`, e));
		}
		if (e > this.remain) {
			let e = Object.assign(Error(`did not encounter expected EOF`), {
				path: this.absolute,
				syscall: `read`,
				code: `EOF`
			});
			return this[CLOSE](() => this.emit(`error`, e));
		}
		if (!this.buf) throw Error(`should have created buffer prior to reading`);
		if (e === this.remain) for (let t = e; t < this.length && e < this.blockRemain; t++) this.buf[t + this.offset] = 0, e++, this.remain++;
		let t = this.offset === 0 && e === this.buf.length ? this.buf : this.buf.subarray(this.offset, this.offset + e);
		this.write(t) ? this[ONDRAIN$1]() : this[AWAITDRAIN](() => this[ONDRAIN$1]());
	}
	[AWAITDRAIN](e) {
		this.once(`drain`, e);
	}
	write(e, t, n) {
		if (typeof t == `function` && (n = t, t = void 0), typeof e == `string` && (e = Buffer.from(e, typeof t == `string` ? t : `utf8`)), this.blockRemain < e.length) {
			let e = Object.assign(Error(`writing more data than expected`), { path: this.absolute });
			return this.emit(`error`, e);
		}
		return this.remain -= e.length, this.blockRemain -= e.length, this.pos += e.length, this.offset += e.length, super.write(e, null, n);
	}
	[ONDRAIN$1]() {
		if (!this.remain) return this.blockRemain && super.write(Buffer.alloc(this.blockRemain)), this[CLOSE]((e) => e ? this.emit(`error`, e) : this.end());
		if (!this.buf) throw Error(`buffer lost somehow in ONDRAIN`);
		this.offset >= this.length && (this.buf = Buffer.allocUnsafe(Math.min(this.blockRemain, this.buf.length)), this.offset = 0), this.length = this.buf.length - this.offset, this[READ]();
	}
}, WriteEntrySync = class extends WriteEntry {
	sync = !0;
	[LSTAT]() {
		this[ONLSTAT](fs$1.lstatSync(this.absolute));
	}
	[SYMLINK$1]() {
		this[ONREADLINK](fs$1.readlinkSync(this.absolute));
	}
	[OPENFILE]() {
		this[ONOPENFILE](fs$1.openSync(this.absolute, `r`));
	}
	[READ]() {
		let e = !0;
		try {
			let { fd: t, buf: n, offset: r, length: i, pos: a } = this;
			if (t === void 0 || n === void 0) throw Error(`fd and buf must be set in READ method`);
			let o = fs$1.readSync(t, n, r, i, a);
			this[ONREAD](o), e = !1;
		} finally {
			if (e) try {
				this[CLOSE](() => {});
			} catch {}
		}
	}
	[AWAITDRAIN](e) {
		e();
	}
	[CLOSE](e = () => {}) {
		this.fd !== void 0 && fs$1.closeSync(this.fd), e();
	}
}, WriteEntryTar = class extends Minipass {
	blockLen = 0;
	blockRemain = 0;
	buf = 0;
	pos = 0;
	remain = 0;
	length = 0;
	preservePaths;
	portable;
	strict;
	noPax;
	noMtime;
	readEntry;
	type;
	prefix;
	path;
	mode;
	uid;
	gid;
	uname;
	gname;
	header;
	mtime;
	atime;
	ctime;
	linkpath;
	size;
	onWriteEntry;
	warn(e, t, n = {}) {
		return warnMethod(this, e, t, n);
	}
	constructor(e, t = {}) {
		let n = dealias(t);
		super(), this.preservePaths = !!n.preservePaths, this.portable = !!n.portable, this.strict = !!n.strict, this.noPax = !!n.noPax, this.noMtime = !!n.noMtime, this.onWriteEntry = n.onWriteEntry, this.readEntry = e;
		let { type: r } = e;
		if (r === `Unsupported`) throw Error(`writing entry that should be ignored`);
		this.type = r, this.type === `Directory` && this.portable && (this.noMtime = !0), this.prefix = n.prefix, this.path = normalizeWindowsPath(e.path), this.mode = e.mode === void 0 ? void 0 : this[MODE](e.mode), this.uid = this.portable ? void 0 : e.uid, this.gid = this.portable ? void 0 : e.gid, this.uname = this.portable ? void 0 : e.uname, this.gname = this.portable ? void 0 : e.gname, this.size = e.size, this.mtime = this.noMtime ? void 0 : n.mtime || e.mtime, this.atime = this.portable ? void 0 : e.atime, this.ctime = this.portable ? void 0 : e.ctime, this.linkpath = e.linkpath === void 0 ? void 0 : normalizeWindowsPath(e.linkpath), typeof n.onwarn == `function` && this.on(`warn`, n.onwarn);
		let i = !1;
		if (!this.preservePaths) {
			let [e, t] = stripAbsolutePath(this.path);
			e && typeof t == `string` && (this.path = t, i = e);
		}
		this.remain = e.size, this.blockRemain = e.startBlockSize, this.onWriteEntry?.(this), this.header = new Header({
			path: this[PREFIX](this.path),
			linkpath: this.type === `Link` && this.linkpath !== void 0 ? this[PREFIX](this.linkpath) : this.linkpath,
			mode: this.mode,
			uid: this.portable ? void 0 : this.uid,
			gid: this.portable ? void 0 : this.gid,
			size: this.size,
			mtime: this.noMtime ? void 0 : this.mtime,
			type: this.type,
			uname: this.portable ? void 0 : this.uname,
			atime: this.portable ? void 0 : this.atime,
			ctime: this.portable ? void 0 : this.ctime
		}), i && this.warn(`TAR_ENTRY_INFO`, `stripping ${i} from absolute path`, {
			entry: this,
			path: i + this.path
		}), this.header.encode() && !this.noPax && super.write(new Pax({
			atime: this.portable ? void 0 : this.atime,
			ctime: this.portable ? void 0 : this.ctime,
			gid: this.portable ? void 0 : this.gid,
			mtime: this.noMtime ? void 0 : this.mtime,
			path: this[PREFIX](this.path),
			linkpath: this.type === `Link` && this.linkpath !== void 0 ? this[PREFIX](this.linkpath) : this.linkpath,
			size: this.size,
			uid: this.portable ? void 0 : this.uid,
			uname: this.portable ? void 0 : this.uname,
			dev: this.portable ? void 0 : this.readEntry.dev,
			ino: this.portable ? void 0 : this.readEntry.ino,
			nlink: this.portable ? void 0 : this.readEntry.nlink
		}).encode());
		let a = this.header?.block;
		if (!a) throw Error(`failed to encode header`);
		super.write(a), e.pipe(this);
	}
	[PREFIX](e) {
		return prefixPath(e, this.prefix);
	}
	[MODE](e) {
		return modeFix(e, this.type === `Directory`, this.portable);
	}
	write(e, t, n) {
		typeof t == `function` && (n = t, t = void 0), typeof e == `string` && (e = Buffer.from(e, typeof t == `string` ? t : `utf8`));
		let r = e.length;
		if (r > this.blockRemain) throw Error(`writing more to entry than is appropriate`);
		return this.blockRemain -= r, super.write(e, n);
	}
	end(e, t, n) {
		return this.blockRemain && super.write(Buffer.alloc(this.blockRemain)), typeof e == `function` && (n = e, t = void 0, e = void 0), typeof t == `function` && (n = t, t = void 0), typeof e == `string` && (e = Buffer.from(e, t ?? `utf8`)), n && this.once(`finish`, n), e ? super.end(e, n) : super.end(n), this;
	}
};
const getType = (e) => e.isFile() ? `File` : e.isDirectory() ? `Directory` : e.isSymbolicLink() ? `SymbolicLink` : `Unsupported`;
var Yallist = class e {
	tail;
	head;
	length = 0;
	static create(t = []) {
		return new e(t);
	}
	constructor(e = []) {
		for (let t of e) this.push(t);
	}
	*[Symbol.iterator]() {
		for (let e = this.head; e; e = e.next) yield e.value;
	}
	removeNode(e) {
		if (e.list !== this) throw Error(`removing node which does not belong to this list`);
		let t = e.next, n = e.prev;
		return t && (t.prev = n), n && (n.next = t), e === this.head && (this.head = t), e === this.tail && (this.tail = n), this.length--, e.next = void 0, e.prev = void 0, e.list = void 0, t;
	}
	unshiftNode(e) {
		if (e === this.head) return;
		e.list && e.list.removeNode(e);
		let t = this.head;
		e.list = this, e.next = t, t && (t.prev = e), this.head = e, this.tail ||= e, this.length++;
	}
	pushNode(e) {
		if (e === this.tail) return;
		e.list && e.list.removeNode(e);
		let t = this.tail;
		e.list = this, e.prev = t, t && (t.next = e), this.tail = e, this.head ||= e, this.length++;
	}
	push(...e) {
		for (let t = 0, n = e.length; t < n; t++) push(this, e[t]);
		return this.length;
	}
	unshift(...e) {
		for (var t = 0, n = e.length; t < n; t++) unshift(this, e[t]);
		return this.length;
	}
	pop() {
		if (!this.tail) return;
		let e = this.tail.value, t = this.tail;
		return this.tail = this.tail.prev, this.tail ? this.tail.next = void 0 : this.head = void 0, t.list = void 0, this.length--, e;
	}
	shift() {
		if (!this.head) return;
		let e = this.head.value, t = this.head;
		return this.head = this.head.next, this.head ? this.head.prev = void 0 : this.tail = void 0, t.list = void 0, this.length--, e;
	}
	forEach(e, t) {
		t ||= this;
		for (let n = this.head, r = 0; n; r++) e.call(t, n.value, r, this), n = n.next;
	}
	forEachReverse(e, t) {
		t ||= this;
		for (let n = this.tail, r = this.length - 1; n; r--) e.call(t, n.value, r, this), n = n.prev;
	}
	get(e) {
		let t = 0, n = this.head;
		for (; n && t < e; t++) n = n.next;
		if (t === e && n) return n.value;
	}
	getReverse(e) {
		let t = 0, n = this.tail;
		for (; n && t < e; t++) n = n.prev;
		if (t === e && n) return n.value;
	}
	map(t, n) {
		n ||= this;
		let r = new e();
		for (let e = this.head; e;) r.push(t.call(n, e.value, this)), e = e.next;
		return r;
	}
	mapReverse(t, n) {
		n ||= this;
		var r = new e();
		for (let e = this.tail; e;) r.push(t.call(n, e.value, this)), e = e.prev;
		return r;
	}
	reduce(e, t) {
		let n, r = this.head;
		if (arguments.length > 1) n = t;
		else if (this.head) r = this.head.next, n = this.head.value;
		else throw TypeError(`Reduce of empty list with no initial value`);
		for (var i = 0; r; i++) n = e(n, r.value, i), r = r.next;
		return n;
	}
	reduceReverse(e, t) {
		let n, r = this.tail;
		if (arguments.length > 1) n = t;
		else if (this.tail) r = this.tail.prev, n = this.tail.value;
		else throw TypeError(`Reduce of empty list with no initial value`);
		for (let t = this.length - 1; r; t--) n = e(n, r.value, t), r = r.prev;
		return n;
	}
	toArray() {
		let e = Array(this.length);
		for (let t = 0, n = this.head; n; t++) e[t] = n.value, n = n.next;
		return e;
	}
	toArrayReverse() {
		let e = Array(this.length);
		for (let t = 0, n = this.tail; n; t++) e[t] = n.value, n = n.prev;
		return e;
	}
	slice(t = 0, n = this.length) {
		n < 0 && (n += this.length), t < 0 && (t += this.length);
		let r = new e();
		if (n < t || n < 0) return r;
		t < 0 && (t = 0), n > this.length && (n = this.length);
		let i = this.head, a = 0;
		for (a = 0; i && a < t; a++) i = i.next;
		for (; i && a < n; a++, i = i.next) r.push(i.value);
		return r;
	}
	sliceReverse(t = 0, n = this.length) {
		n < 0 && (n += this.length), t < 0 && (t += this.length);
		let r = new e();
		if (n < t || n < 0) return r;
		t < 0 && (t = 0), n > this.length && (n = this.length);
		let i = this.length, a = this.tail;
		for (; a && i > n; i--) a = a.prev;
		for (; a && i > t; i--, a = a.prev) r.push(a.value);
		return r;
	}
	splice(e, t = 0, ...n) {
		e > this.length && (e = this.length - 1), e < 0 && (e = this.length + e);
		let r = this.head;
		for (let t = 0; r && t < e; t++) r = r.next;
		let i = [];
		for (let e = 0; r && e < t; e++) i.push(r.value), r = this.removeNode(r);
		r ? r !== this.tail && (r = r.prev) : r = this.tail;
		for (let e of n) r = insertAfter(this, r, e);
		return i;
	}
	reverse() {
		let e = this.head, t = this.tail;
		for (let t = e; t; t = t.prev) {
			let e = t.prev;
			t.prev = t.next, t.next = e;
		}
		return this.head = t, this.tail = e, this;
	}
};
function insertAfter(e, t, n) {
	let r = new Node(n, t, t ? t.next : e.head, e);
	return r.next === void 0 && (e.tail = r), r.prev === void 0 && (e.head = r), e.length++, r;
}
function push(e, t) {
	e.tail = new Node(t, e.tail, void 0, e), e.head ||= e.tail, e.length++;
}
function unshift(e, t) {
	e.head = new Node(t, void 0, e.head, e), e.tail ||= e.head, e.length++;
}
var Node = class {
	list;
	next;
	prev;
	value;
	constructor(e, t, n, r) {
		this.list = r, this.value = e, t ? (t.next = this, this.prev = t) : this.prev = void 0, n ? (n.prev = this, this.next = n) : this.next = void 0;
	}
}, PackJob = class {
	path;
	absolute;
	entry;
	stat;
	readdir;
	pending = !1;
	ignore = !1;
	piped = !1;
	constructor(e, t) {
		this.path = e || `./`, this.absolute = t;
	}
};
const EOF = Buffer.alloc(1024), ONSTAT = Symbol(`onStat`), ENDED$1 = Symbol(`ended`), QUEUE = Symbol(`queue`), CURRENT = Symbol(`current`), PROCESS = Symbol(`process`), PROCESSING = Symbol(`processing`), PROCESSJOB = Symbol(`processJob`), JOBS = Symbol(`jobs`), JOBDONE = Symbol(`jobDone`), ADDFSENTRY = Symbol(`addFSEntry`), ADDTARENTRY = Symbol(`addTarEntry`), STAT = Symbol(`stat`), READDIR = Symbol(`readdir`), ONREADDIR = Symbol(`onreaddir`), PIPE = Symbol(`pipe`), ENTRY = Symbol(`entry`), ENTRYOPT = Symbol(`entryOpt`), WRITEENTRYCLASS = Symbol(`writeEntryClass`), WRITE = Symbol(`write`), ONDRAIN = Symbol(`ondrain`);
var Pack = class extends Minipass {
	sync = !1;
	opt;
	cwd;
	maxReadSize;
	preservePaths;
	strict;
	noPax;
	prefix;
	linkCache;
	statCache;
	file;
	portable;
	zip;
	readdirCache;
	noDirRecurse;
	follow;
	noMtime;
	mtime;
	filter;
	jobs;
	[WRITEENTRYCLASS];
	onWriteEntry;
	[QUEUE];
	[JOBS] = 0;
	[PROCESSING] = !1;
	[ENDED$1] = !1;
	constructor(e = {}) {
		if (super(), this.opt = e, this.file = e.file || ``, this.cwd = e.cwd || process.cwd(), this.maxReadSize = e.maxReadSize, this.preservePaths = !!e.preservePaths, this.strict = !!e.strict, this.noPax = !!e.noPax, this.prefix = normalizeWindowsPath(e.prefix || ``), this.linkCache = e.linkCache || /* @__PURE__ */ new Map(), this.statCache = e.statCache || /* @__PURE__ */ new Map(), this.readdirCache = e.readdirCache || /* @__PURE__ */ new Map(), this.onWriteEntry = e.onWriteEntry, this[WRITEENTRYCLASS] = WriteEntry, typeof e.onwarn == `function` && this.on(`warn`, e.onwarn), this.portable = !!e.portable, e.gzip || e.brotli || e.zstd) {
			if ((e.gzip ? 1 : 0) + (e.brotli ? 1 : 0) + (e.zstd ? 1 : 0) > 1) throw TypeError(`gzip, brotli, zstd are mutually exclusive`);
			if (e.gzip && (typeof e.gzip != `object` && (e.gzip = {}), this.portable && (e.gzip.portable = !0), this.zip = new Gzip(e.gzip)), e.brotli && (typeof e.brotli != `object` && (e.brotli = {}), this.zip = new BrotliCompress(e.brotli)), e.zstd && (typeof e.zstd != `object` && (e.zstd = {}), this.zip = new ZstdCompress(e.zstd)), !this.zip) throw Error(`impossible`);
			let t = this.zip;
			t.on(`data`, (e) => super.write(e)), t.on(`end`, () => super.end()), t.on(`drain`, () => this[ONDRAIN]()), this.on(`resume`, () => t.resume());
		} else this.on(`drain`, this[ONDRAIN]);
		this.noDirRecurse = !!e.noDirRecurse, this.follow = !!e.follow, this.noMtime = !!e.noMtime, e.mtime && (this.mtime = e.mtime), this.filter = typeof e.filter == `function` ? e.filter : () => !0, this[QUEUE] = new Yallist(), this[JOBS] = 0, this.jobs = Number(e.jobs) || 4, this[PROCESSING] = !1, this[ENDED$1] = !1;
	}
	[WRITE](e) {
		return super.write(e);
	}
	add(e) {
		return this.write(e), this;
	}
	end(e, t, n) {
		return typeof e == `function` && (n = e, e = void 0), typeof t == `function` && (n = t, t = void 0), e && this.add(e), this[ENDED$1] = !0, this[PROCESS](), n && n(), this;
	}
	write(e) {
		if (this[ENDED$1]) throw Error(`write after end`);
		return e instanceof ReadEntry ? this[ADDTARENTRY](e) : this[ADDFSENTRY](e), this.flowing;
	}
	[ADDTARENTRY](e) {
		let t = normalizeWindowsPath(path$1.resolve(this.cwd, e.path));
		if (!this.filter(e.path, e)) e.resume();
		else {
			let n = new PackJob(e.path, t);
			n.entry = new WriteEntryTar(e, this[ENTRYOPT](n)), n.entry.on(`end`, () => this[JOBDONE](n)), this[JOBS] += 1, this[QUEUE].push(n);
		}
		this[PROCESS]();
	}
	[ADDFSENTRY](e) {
		let t = normalizeWindowsPath(path$1.resolve(this.cwd, e));
		this[QUEUE].push(new PackJob(e, t)), this[PROCESS]();
	}
	[STAT](e) {
		e.pending = !0, this[JOBS] += 1, fs$1[this.follow ? `stat` : `lstat`](e.absolute, (t, n) => {
			e.pending = !1, --this[JOBS], t ? this.emit(`error`, t) : this[ONSTAT](e, n);
		});
	}
	[ONSTAT](e, t) {
		this.statCache.set(e.absolute, t), e.stat = t, this.filter(e.path, t) ? t.isFile() && t.nlink > 1 && e === this[CURRENT] && !this.linkCache.get(`${t.dev}:${t.ino}`) && !this.sync && this[PROCESSJOB](e) : e.ignore = !0, this[PROCESS]();
	}
	[READDIR](e) {
		e.pending = !0, this[JOBS] += 1, fs$1.readdir(e.absolute, (t, n) => {
			if (e.pending = !1, --this[JOBS], t) return this.emit(`error`, t);
			this[ONREADDIR](e, n);
		});
	}
	[ONREADDIR](e, t) {
		this.readdirCache.set(e.absolute, t), e.readdir = t, this[PROCESS]();
	}
	[PROCESS]() {
		if (!this[PROCESSING]) {
			this[PROCESSING] = !0;
			for (let e = this[QUEUE].head; e && this[JOBS] < this.jobs; e = e.next) if (this[PROCESSJOB](e.value), e.value.ignore) {
				let t = e.next;
				this[QUEUE].removeNode(e), e.next = t;
			}
			this[PROCESSING] = !1, this[ENDED$1] && !this[QUEUE].length && this[JOBS] === 0 && (this.zip ? this.zip.end(EOF) : (super.write(EOF), super.end()));
		}
	}
	get [CURRENT]() {
		return this[QUEUE] && this[QUEUE].head && this[QUEUE].head.value;
	}
	[JOBDONE](e) {
		this[QUEUE].shift(), --this[JOBS], this[PROCESS]();
	}
	[PROCESSJOB](e) {
		if (!e.pending) {
			if (e.entry) {
				e === this[CURRENT] && !e.piped && this[PIPE](e);
				return;
			}
			if (!e.stat) {
				let t = this.statCache.get(e.absolute);
				t ? this[ONSTAT](e, t) : this[STAT](e);
			}
			if (e.stat && !e.ignore) {
				if (!this.noDirRecurse && e.stat.isDirectory() && !e.readdir) {
					let t = this.readdirCache.get(e.absolute);
					if (t ? this[ONREADDIR](e, t) : this[READDIR](e), !e.readdir) return;
				}
				if (e.entry = this[ENTRY](e), !e.entry) {
					e.ignore = !0;
					return;
				}
				e === this[CURRENT] && !e.piped && this[PIPE](e);
			}
		}
	}
	[ENTRYOPT](e) {
		return {
			onwarn: (e, t, n) => this.warn(e, t, n),
			noPax: this.noPax,
			cwd: this.cwd,
			absolute: e.absolute,
			preservePaths: this.preservePaths,
			maxReadSize: this.maxReadSize,
			strict: this.strict,
			portable: this.portable,
			linkCache: this.linkCache,
			statCache: this.statCache,
			noMtime: this.noMtime,
			mtime: this.mtime,
			prefix: this.prefix,
			onWriteEntry: this.onWriteEntry
		};
	}
	[ENTRY](e) {
		this[JOBS] += 1;
		try {
			return new this[WRITEENTRYCLASS](e.path, this[ENTRYOPT](e)).on(`end`, () => this[JOBDONE](e)).on(`error`, (e) => this.emit(`error`, e));
		} catch (e) {
			this.emit(`error`, e);
		}
	}
	[ONDRAIN]() {
		this[CURRENT] && this[CURRENT].entry && this[CURRENT].entry.resume();
	}
	[PIPE](e) {
		e.piped = !0, e.readdir && e.readdir.forEach((t) => {
			let n = e.path, r = n === `./` ? `` : n.replace(/\/*$/, `/`);
			this[ADDFSENTRY](r + t);
		});
		let t = e.entry, n = this.zip;
		if (!t) throw Error(`cannot pipe without source`);
		n ? t.on(`data`, (e) => {
			n.write(e) || t.pause();
		}) : t.on(`data`, (e) => {
			super.write(e) || t.pause();
		});
	}
	pause() {
		return this.zip && this.zip.pause(), super.pause();
	}
	warn(e, t, n = {}) {
		warnMethod(this, e, t, n);
	}
}, PackSync = class extends Pack {
	sync = !0;
	constructor(e) {
		super(e), this[WRITEENTRYCLASS] = WriteEntrySync;
	}
	pause() {}
	resume() {}
	[STAT](e) {
		let t = this.follow ? `statSync` : `lstatSync`;
		this[ONSTAT](e, fs$1[t](e.absolute));
	}
	[READDIR](e) {
		this[ONREADDIR](e, fs$1.readdirSync(e.absolute));
	}
	[PIPE](e) {
		let t = e.entry, n = this.zip;
		if (e.readdir && e.readdir.forEach((t) => {
			let n = e.path, r = n === `./` ? `` : n.replace(/\/*$/, `/`);
			this[ADDFSENTRY](r + t);
		}), !t) throw Error(`Cannot pipe without source`);
		n ? t.on(`data`, (e) => {
			n.write(e);
		}) : t.on(`data`, (e) => {
			super[WRITE](e);
		});
	}
};
const createFileSync = (e, t) => {
	let r = new PackSync(e), i = new WriteStreamSync(e.file, { mode: e.mode || 438 });
	r.pipe(i), addFilesSync$1(r, t);
}, createFile = (e, t) => {
	let n = new Pack(e), r = new WriteStream(e.file, { mode: e.mode || 438 });
	n.pipe(r);
	let a = new Promise((e, t) => {
		r.on(`error`, t), r.on(`close`, e), n.on(`error`, t);
	});
	return addFilesAsync$1(n, t), a;
}, addFilesSync$1 = (e, t) => {
	t.forEach((t) => {
		t.charAt(0) === `@` ? list({
			file: path.resolve(e.cwd, t.slice(1)),
			sync: !0,
			noResume: !0,
			onReadEntry: (t) => e.add(t)
		}) : e.add(t);
	}), e.end();
}, addFilesAsync$1 = async (e, t) => {
	for (let n = 0; n < t.length; n++) {
		let r = String(t[n]);
		r.charAt(0) === `@` ? await list({
			file: path.resolve(String(e.cwd), r.slice(1)),
			noResume: !0,
			onReadEntry: (t) => {
				e.add(t);
			}
		}) : e.add(r);
	}
	e.end();
};
makeCommand(createFileSync, createFile, (e, t) => {
	let n = new PackSync(e);
	return addFilesSync$1(n, t), n;
}, (e, t) => {
	let n = new Pack(e);
	return addFilesAsync$1(n, t), n;
}, (e, t) => {
	if (!t?.length) throw TypeError(`no paths specified to add to archive`);
});
const isWindows$2 = (process.env.__FAKE_PLATFORM__ || process.platform) === `win32`, { O_CREAT, O_TRUNC, O_WRONLY } = fs$1.constants, UV_FS_O_FILEMAP = Number(process.env.__FAKE_FS_O_FILENAME__) || fs$1.constants.UV_FS_O_FILEMAP || 0, fMapEnabled = isWindows$2 && !!UV_FS_O_FILEMAP, fMapFlag = UV_FS_O_FILEMAP | O_TRUNC | O_CREAT | O_WRONLY, getWriteFlag = fMapEnabled ? (e) => e < 524288 ? fMapFlag : `w` : () => `w`;
var CwdError = class extends Error {
	path;
	code;
	syscall = `chdir`;
	constructor(e, t) {
		super(`${t}: Cannot cd into '${e}'`), this.path = e, this.code = t;
	}
	get name() {
		return `CwdError`;
	}
}, SymlinkError = class extends Error {
	path;
	symlink;
	syscall = `symlink`;
	code = `TAR_SYMLINK_ERROR`;
	constructor(e, t) {
		super(`TAR_SYMLINK_ERROR: Cannot extract through symbolic link`), this.symlink = e, this.path = t;
	}
	get name() {
		return `SymlinkError`;
	}
};
const checkCwd = (e, t) => {
	fs.stat(e, (n, r) => {
		(n || !r.isDirectory()) && (n = new CwdError(e, n?.code || `ENOTDIR`)), t(n);
	});
}, mkdir$1 = (e, t, n) => {
	e = normalizeWindowsPath(e);
	let r = t.umask ?? 18, i = t.mode | 448, a = (i & r) !== 0, o = t.uid, s = t.gid, c = typeof o == `number` && typeof s == `number` && (o !== t.processUid || s !== t.processGid), l = t.preserve, u = t.unlink, d = normalizeWindowsPath(t.cwd), f = (t, r) => {
		t ? n(t) : r && c ? chownr(r, o, s, (e) => f(e)) : a ? fs.chmod(e, i, n) : n();
	};
	if (e === d) return checkCwd(e, f);
	if (l) return fsp.mkdir(e, {
		mode: i,
		recursive: !0
	}).then((e) => f(null, e ?? void 0), f);
	mkdir_(d, normalizeWindowsPath(path.relative(d, e)).split(`/`), i, u, d, void 0, f);
}, mkdir_ = (e, t, n, r, i, a, o) => {
	if (!t.length) return o(null, a);
	let s = t.shift(), c = normalizeWindowsPath(path.resolve(e + `/` + s));
	fs.mkdir(c, n, onmkdir(c, t, n, r, i, a, o));
}, onmkdir = (e, t, n, r, i, a, o) => (s) => {
	s ? fs.lstat(e, (c, l) => {
		if (c) c.path = c.path && normalizeWindowsPath(c.path), o(c);
		else if (l.isDirectory()) mkdir_(e, t, n, r, i, a, o);
		else if (r) fs.unlink(e, (s) => {
			if (s) return o(s);
			fs.mkdir(e, n, onmkdir(e, t, n, r, i, a, o));
		});
		else if (l.isSymbolicLink()) return o(new SymlinkError(e, e + `/` + t.join(`/`)));
		else o(s);
	}) : (a ||= e, mkdir_(e, t, n, r, i, a, o));
}, checkCwdSync = (e) => {
	let t = !1, n;
	try {
		t = fs.statSync(e).isDirectory();
	} catch (e) {
		n = e?.code;
	} finally {
		if (!t) throw new CwdError(e, n ?? `ENOTDIR`);
	}
}, mkdirSync = (e, t) => {
	e = normalizeWindowsPath(e);
	let n = t.umask ?? 18, r = t.mode | 448, i = (r & n) !== 0, a = t.uid, o = t.gid, s = typeof a == `number` && typeof o == `number` && (a !== t.processUid || o !== t.processGid), c = t.preserve, l = t.unlink, u = normalizeWindowsPath(t.cwd), d = (t) => {
		t && s && chownrSync(t, a, o), i && fs.chmodSync(e, r);
	};
	if (e === u) return checkCwdSync(u), d();
	if (c) return d(fs.mkdirSync(e, {
		mode: r,
		recursive: !0
	}) ?? void 0);
	let p = normalizeWindowsPath(path.relative(u, e)).split(`/`), m;
	for (let e = p.shift(), t = u; e && (t += `/` + e); e = p.shift()) {
		t = normalizeWindowsPath(path.resolve(t));
		try {
			fs.mkdirSync(t, r), m ||= t;
		} catch {
			let e = fs.lstatSync(t);
			if (e.isDirectory()) continue;
			if (l) {
				fs.unlinkSync(t), fs.mkdirSync(t, r), m ||= t;
				continue;
			} else if (e.isSymbolicLink()) return new SymlinkError(t, t + `/` + p.join(`/`));
		}
	}
	return d(m);
}, normalizeCache = Object.create(null), MAX = 1e4, cache = /* @__PURE__ */ new Set(), normalizeUnicode = (e) => {
	cache.has(e) ? cache.delete(e) : normalizeCache[e] = e.normalize(`NFD`).toLocaleLowerCase(`en`).toLocaleUpperCase(`en`), cache.add(e);
	let t = normalizeCache[e], n = cache.size - MAX;
	if (n > MAX / 10) {
		for (let e of cache) if (cache.delete(e), delete normalizeCache[e], --n <= 0) break;
	}
	return t;
}, isWindows$1 = (process.env.TESTING_TAR_FAKE_PLATFORM || process.platform) === `win32`, getDirs = (e) => e.split(`/`).slice(0, -1).reduce((e, t) => {
	let n = e[e.length - 1];
	return n !== void 0 && (t = join(n, t)), e.push(t || `/`), e;
}, []);
var PathReservations = class {
	#queues = /* @__PURE__ */ new Map();
	#reservations = /* @__PURE__ */ new Map();
	#running = /* @__PURE__ */ new Set();
	reserve(e, t) {
		e = isWindows$1 ? [`win32 parallelization disabled`] : e.map((e) => stripTrailingSlashes(join(normalizeUnicode(e))));
		let n = new Set(e.map((e) => getDirs(e)).reduce((e, t) => e.concat(t)));
		this.#reservations.set(t, {
			dirs: n,
			paths: e
		});
		for (let n of e) {
			let e = this.#queues.get(n);
			e ? e.push(t) : this.#queues.set(n, [t]);
		}
		for (let e of n) {
			let n = this.#queues.get(e);
			if (!n) this.#queues.set(e, [new Set([t])]);
			else {
				let e = n[n.length - 1];
				e instanceof Set ? e.add(t) : n.push(new Set([t]));
			}
		}
		return this.#run(t);
	}
	#getQueues(e) {
		let t = this.#reservations.get(e);
		if (!t) throw Error(`function does not have any path reservations`);
		return {
			paths: t.paths.map((e) => this.#queues.get(e)),
			dirs: [...t.dirs].map((e) => this.#queues.get(e))
		};
	}
	check(e) {
		let { paths: t, dirs: n } = this.#getQueues(e);
		return t.every((t) => t && t[0] === e) && n.every((t) => t && t[0] instanceof Set && t[0].has(e));
	}
	#run(e) {
		return this.#running.has(e) || !this.check(e) ? !1 : (this.#running.add(e), e(() => this.#clear(e)), !0);
	}
	#clear(e) {
		if (!this.#running.has(e)) return !1;
		let t = this.#reservations.get(e);
		if (!t) throw Error(`invalid reservation`);
		let { paths: n, dirs: r } = t, i = /* @__PURE__ */ new Set();
		for (let t of n) {
			let n = this.#queues.get(t);
			if (!n || n?.[0] !== e) continue;
			let r = n[1];
			if (!r) {
				this.#queues.delete(t);
				continue;
			}
			if (n.shift(), typeof r == `function`) i.add(r);
			else for (let e of r) i.add(e);
		}
		for (let t of r) {
			let n = this.#queues.get(t), r = n?.[0];
			if (!(!n || !(r instanceof Set))) if (r.size === 1 && n.length === 1) {
				this.#queues.delete(t);
				continue;
			} else if (r.size === 1) {
				n.shift();
				let e = n[0];
				typeof e == `function` && i.add(e);
			} else r.delete(e);
		}
		return this.#running.delete(e), i.forEach((e) => this.#run(e)), !0;
	}
};
const ONENTRY = Symbol(`onEntry`), CHECKFS = Symbol(`checkFs`), CHECKFS2 = Symbol(`checkFs2`), ISREUSABLE = Symbol(`isReusable`), MAKEFS = Symbol(`makeFs`), FILE = Symbol(`file`), DIRECTORY = Symbol(`directory`), LINK = Symbol(`link`), SYMLINK = Symbol(`symlink`), HARDLINK = Symbol(`hardlink`), UNSUPPORTED = Symbol(`unsupported`), CHECKPATH = Symbol(`checkPath`), STRIPABSOLUTEPATH = Symbol(`stripAbsolutePath`), MKDIR = Symbol(`mkdir`), ONERROR = Symbol(`onError`), PENDING = Symbol(`pending`), PEND = Symbol(`pend`), UNPEND = Symbol(`unpend`), ENDED = Symbol(`ended`), MAYBECLOSE = Symbol(`maybeClose`), SKIP = Symbol(`skip`), DOCHOWN = Symbol(`doChown`), UID = Symbol(`uid`), GID = Symbol(`gid`), CHECKED_CWD = Symbol(`checkedCwd`), isWindows = (process.env.TESTING_TAR_FAKE_PLATFORM || process.platform) === `win32`, unlinkFile = (e, t) => {
	if (!isWindows) return fs.unlink(e, t);
	let n = e + `.DELETE.` + randomBytes(16).toString(`hex`);
	fs.rename(e, n, (e) => {
		if (e) return t(e);
		fs.unlink(n, t);
	});
}, unlinkFileSync = (e) => {
	if (!isWindows) return fs.unlinkSync(e);
	let t = e + `.DELETE.` + randomBytes(16).toString(`hex`);
	fs.renameSync(e, t), fs.unlinkSync(t);
}, uint32 = (e, t, n) => e !== void 0 && e === e >>> 0 ? e : t !== void 0 && t === t >>> 0 ? t : n;
var Unpack = class extends Parser {
	[ENDED] = !1;
	[CHECKED_CWD] = !1;
	[PENDING] = 0;
	reservations = new PathReservations();
	transform;
	writable = !0;
	readable = !1;
	uid;
	gid;
	setOwner;
	preserveOwner;
	processGid;
	processUid;
	maxDepth;
	forceChown;
	win32;
	newer;
	keep;
	noMtime;
	preservePaths;
	unlink;
	cwd;
	strip;
	processUmask;
	umask;
	dmode;
	fmode;
	chmod;
	constructor(e = {}) {
		if (e.ondone = () => {
			this[ENDED] = !0, this[MAYBECLOSE]();
		}, super(e), this.transform = e.transform, this.chmod = !!e.chmod, typeof e.uid == `number` || typeof e.gid == `number`) {
			if (typeof e.uid != `number` || typeof e.gid != `number`) throw TypeError(`cannot set owner without number uid and gid`);
			if (e.preserveOwner) throw TypeError(`cannot preserve owner in archive and also set owner explicitly`);
			this.uid = e.uid, this.gid = e.gid, this.setOwner = !0;
		} else this.uid = void 0, this.gid = void 0, this.setOwner = !1;
		e.preserveOwner === void 0 && typeof e.uid != `number` ? this.preserveOwner = !!(process.getuid && process.getuid() === 0) : this.preserveOwner = !!e.preserveOwner, this.processUid = (this.preserveOwner || this.setOwner) && process.getuid ? process.getuid() : void 0, this.processGid = (this.preserveOwner || this.setOwner) && process.getgid ? process.getgid() : void 0, this.maxDepth = typeof e.maxDepth == `number` ? e.maxDepth : 1024, this.forceChown = e.forceChown === !0, this.win32 = !!e.win32 || isWindows, this.newer = !!e.newer, this.keep = !!e.keep, this.noMtime = !!e.noMtime, this.preservePaths = !!e.preservePaths, this.unlink = !!e.unlink, this.cwd = normalizeWindowsPath(path.resolve(e.cwd || process.cwd())), this.strip = Number(e.strip) || 0, this.processUmask = this.chmod ? typeof e.processUmask == `number` ? e.processUmask : process.umask() : 0, this.umask = typeof e.umask == `number` ? e.umask : this.processUmask, this.dmode = e.dmode || 511 & ~this.umask, this.fmode = e.fmode || 438 & ~this.umask, this.on(`entry`, (e) => this[ONENTRY](e));
	}
	warn(e, t, n = {}) {
		return (e === `TAR_BAD_ARCHIVE` || e === `TAR_ABORT`) && (n.recoverable = !1), super.warn(e, t, n);
	}
	[MAYBECLOSE]() {
		this[ENDED] && this[PENDING] === 0 && (this.emit(`prefinish`), this.emit(`finish`), this.emit(`end`));
	}
	[STRIPABSOLUTEPATH](e, t) {
		let n = e[t], { type: r } = e;
		if (!n || this.preservePaths) return !0;
		let i = n.split(`/`);
		if (i.includes(`..`) || isWindows && /^[a-z]:\.\.$/i.test(i[0] ?? ``)) {
			if (t === `path` || r === `Link`) return this.warn(`TAR_ENTRY_ERROR`, `${t} contains '..'`, {
				entry: e,
				[t]: n
			}), !1;
			{
				let r = path.posix.dirname(e.path), i = path.posix.normalize(path.posix.join(r, n));
				if (i.startsWith(`../`) || i === `..`) return this.warn(`TAR_ENTRY_ERROR`, `${t} escapes extraction directory`, {
					entry: e,
					[t]: n
				}), !1;
			}
		}
		let [a, o] = stripAbsolutePath(n);
		return a && (e[t] = String(o), this.warn(`TAR_ENTRY_INFO`, `stripping ${a} from absolute ${t}`, {
			entry: e,
			[t]: n
		})), !0;
	}
	[CHECKPATH](e) {
		let t = normalizeWindowsPath(e.path), n = t.split(`/`);
		if (this.strip) {
			if (n.length < this.strip) return !1;
			if (e.type === `Link`) {
				let t = normalizeWindowsPath(String(e.linkpath)).split(`/`);
				if (t.length >= this.strip) e.linkpath = t.slice(this.strip).join(`/`);
				else return !1;
			}
			n.splice(0, this.strip), e.path = n.join(`/`);
		}
		if (isFinite(this.maxDepth) && n.length > this.maxDepth) return this.warn(`TAR_ENTRY_ERROR`, `path excessively deep`, {
			entry: e,
			path: t,
			depth: n.length,
			maxDepth: this.maxDepth
		}), !1;
		if (!this[STRIPABSOLUTEPATH](e, `path`) || !this[STRIPABSOLUTEPATH](e, `linkpath`)) return !1;
		if (path.isAbsolute(e.path) ? e.absolute = normalizeWindowsPath(path.resolve(e.path)) : e.absolute = normalizeWindowsPath(path.resolve(this.cwd, e.path)), !this.preservePaths && typeof e.absolute == `string` && e.absolute.indexOf(this.cwd + `/`) !== 0 && e.absolute !== this.cwd) return this.warn(`TAR_ENTRY_ERROR`, `path escaped extraction target`, {
			entry: e,
			path: normalizeWindowsPath(e.path),
			resolvedPath: e.absolute,
			cwd: this.cwd
		}), !1;
		if (e.absolute === this.cwd && e.type !== `Directory` && e.type !== `GNUDumpDir`) return !1;
		if (this.win32) {
			let { root: t } = path.win32.parse(String(e.absolute));
			e.absolute = t + encode(String(e.absolute).slice(t.length));
			let { root: n } = path.win32.parse(e.path);
			e.path = n + encode(e.path.slice(n.length));
		}
		return !0;
	}
	[ONENTRY](e) {
		if (!this[CHECKPATH](e)) return e.resume();
		switch (assert.equal(typeof e.absolute, `string`), e.type) {
			case `Directory`:
			case `GNUDumpDir`: e.mode && (e.mode |= 448);
			case `File`:
			case `OldFile`:
			case `ContiguousFile`:
			case `Link`:
			case `SymbolicLink`: return this[CHECKFS](e);
			default: return this[UNSUPPORTED](e);
		}
	}
	[ONERROR](e, t) {
		e.name === `CwdError` ? this.emit(`error`, e) : (this.warn(`TAR_ENTRY_ERROR`, e, { entry: t }), this[UNPEND](), t.resume());
	}
	[MKDIR](e, t, n) {
		mkdir$1(normalizeWindowsPath(e), {
			uid: this.uid,
			gid: this.gid,
			processUid: this.processUid,
			processGid: this.processGid,
			umask: this.processUmask,
			preserve: this.preservePaths,
			unlink: this.unlink,
			cwd: this.cwd,
			mode: t
		}, n);
	}
	[DOCHOWN](e) {
		return this.forceChown || this.preserveOwner && (typeof e.uid == `number` && e.uid !== this.processUid || typeof e.gid == `number` && e.gid !== this.processGid) || typeof this.uid == `number` && this.uid !== this.processUid || typeof this.gid == `number` && this.gid !== this.processGid;
	}
	[UID](e) {
		return uint32(this.uid, e.uid, this.processUid);
	}
	[GID](e) {
		return uint32(this.gid, e.gid, this.processGid);
	}
	[FILE](e, t) {
		let n = typeof e.mode == `number` ? e.mode & 4095 : this.fmode, r = new WriteStream(String(e.absolute), {
			flags: getWriteFlag(e.size),
			mode: n,
			autoClose: !1
		});
		r.on(`error`, (n) => {
			r.fd && fs.close(r.fd, () => {}), r.write = () => !0, this[ONERROR](n, e), t();
		});
		let a = 1, o = (n) => {
			if (n) {
				r.fd && fs.close(r.fd, () => {}), this[ONERROR](n, e), t();
				return;
			}
			--a === 0 && r.fd !== void 0 && fs.close(r.fd, (n) => {
				n ? this[ONERROR](n, e) : this[UNPEND](), t();
			});
		};
		r.on(`finish`, () => {
			let t = String(e.absolute), n = r.fd;
			if (typeof n == `number` && e.mtime && !this.noMtime) {
				a++;
				let r = e.atime || /* @__PURE__ */ new Date(), i = e.mtime;
				fs.futimes(n, r, i, (e) => e ? fs.utimes(t, r, i, (t) => o(t && e)) : o());
			}
			if (typeof n == `number` && this[DOCHOWN](e)) {
				a++;
				let r = this[UID](e), i = this[GID](e);
				typeof r == `number` && typeof i == `number` && fs.fchown(n, r, i, (e) => e ? fs.chown(t, r, i, (t) => o(t && e)) : o());
			}
			o();
		});
		let s = this.transform && this.transform(e) || e;
		s !== e && (s.on(`error`, (n) => {
			this[ONERROR](n, e), t();
		}), e.pipe(s)), s.pipe(r);
	}
	[DIRECTORY](e, t) {
		let n = typeof e.mode == `number` ? e.mode & 4095 : this.dmode;
		this[MKDIR](String(e.absolute), n, (n) => {
			if (n) {
				this[ONERROR](n, e), t();
				return;
			}
			let r = 1, i = () => {
				--r === 0 && (t(), this[UNPEND](), e.resume());
			};
			e.mtime && !this.noMtime && (r++, fs.utimes(String(e.absolute), e.atime || /* @__PURE__ */ new Date(), e.mtime, i)), this[DOCHOWN](e) && (r++, fs.chown(String(e.absolute), Number(this[UID](e)), Number(this[GID](e)), i)), i();
		});
	}
	[UNSUPPORTED](e) {
		e.unsupported = !0, this.warn(`TAR_ENTRY_UNSUPPORTED`, `unsupported entry type: ${e.type}`, { entry: e }), e.resume();
	}
	[SYMLINK](e, t) {
		this[LINK](e, String(e.linkpath), `symlink`, t);
	}
	[HARDLINK](e, t) {
		let n = normalizeWindowsPath(path.resolve(this.cwd, String(e.linkpath)));
		this[LINK](e, n, `link`, t);
	}
	[PEND]() {
		this[PENDING]++;
	}
	[UNPEND]() {
		this[PENDING]--, this[MAYBECLOSE]();
	}
	[SKIP](e) {
		this[UNPEND](), e.resume();
	}
	[ISREUSABLE](e, t) {
		return e.type === `File` && !this.unlink && t.isFile() && t.nlink <= 1 && !isWindows;
	}
	[CHECKFS](e) {
		this[PEND]();
		let t = [e.path];
		e.linkpath && t.push(e.linkpath), this.reservations.reserve(t, (t) => this[CHECKFS2](e, t));
	}
	[CHECKFS2](e, t) {
		let n = (e) => {
			t(e);
		}, r = () => {
			this[MKDIR](this.cwd, this.dmode, (t) => {
				if (t) {
					this[ONERROR](t, e), n();
					return;
				}
				this[CHECKED_CWD] = !0, i();
			});
		}, i = () => {
			if (e.absolute !== this.cwd) {
				let t = normalizeWindowsPath(path.dirname(String(e.absolute)));
				if (t !== this.cwd) return this[MKDIR](t, this.dmode, (t) => {
					if (t) {
						this[ONERROR](t, e), n();
						return;
					}
					a();
				});
			}
			a();
		}, a = () => {
			fs.lstat(String(e.absolute), (t, r) => {
				if (r && (this.keep || this.newer && r.mtime > (e.mtime ?? r.mtime))) {
					this[SKIP](e), n();
					return;
				}
				if (t || this[ISREUSABLE](e, r)) return this[MAKEFS](null, e, n);
				if (r.isDirectory()) {
					if (e.type === `Directory`) {
						let t = this.chmod && e.mode && (r.mode & 4095) !== e.mode, i = (t) => this[MAKEFS](t ?? null, e, n);
						return t ? fs.chmod(String(e.absolute), Number(e.mode), i) : i();
					}
					if (e.absolute !== this.cwd) return fs.rmdir(String(e.absolute), (t) => this[MAKEFS](t ?? null, e, n));
				}
				if (e.absolute === this.cwd) return this[MAKEFS](null, e, n);
				unlinkFile(String(e.absolute), (t) => this[MAKEFS](t ?? null, e, n));
			});
		};
		this[CHECKED_CWD] ? i() : r();
	}
	[MAKEFS](e, t, n) {
		if (e) {
			this[ONERROR](e, t), n();
			return;
		}
		switch (t.type) {
			case `File`:
			case `OldFile`:
			case `ContiguousFile`: return this[FILE](t, n);
			case `Link`: return this[HARDLINK](t, n);
			case `SymbolicLink`: return this[SYMLINK](t, n);
			case `Directory`:
			case `GNUDumpDir`: return this[DIRECTORY](t, n);
		}
	}
	[LINK](e, t, n, r) {
		fs[n](t, String(e.absolute), (t) => {
			t ? this[ONERROR](t, e) : (this[UNPEND](), e.resume()), r();
		});
	}
};
const callSync = (e) => {
	try {
		return [null, e()];
	} catch (e) {
		return [e, null];
	}
};
var UnpackSync = class extends Unpack {
	sync = !0;
	[MAKEFS](e, t) {
		return super[MAKEFS](e, t, () => {});
	}
	[CHECKFS](e) {
		if (!this[CHECKED_CWD]) {
			let t = this[MKDIR](this.cwd, this.dmode);
			if (t) return this[ONERROR](t, e);
			this[CHECKED_CWD] = !0;
		}
		if (e.absolute !== this.cwd) {
			let t = normalizeWindowsPath(path.dirname(String(e.absolute)));
			if (t !== this.cwd) {
				let n = this[MKDIR](t, this.dmode);
				if (n) return this[ONERROR](n, e);
			}
		}
		let [t, n] = callSync(() => fs.lstatSync(String(e.absolute)));
		if (n && (this.keep || this.newer && n.mtime > (e.mtime ?? n.mtime))) return this[SKIP](e);
		if (t || this[ISREUSABLE](e, n)) return this[MAKEFS](null, e);
		if (n.isDirectory()) {
			if (e.type === `Directory`) {
				let [t] = this.chmod && e.mode && (n.mode & 4095) !== e.mode ? callSync(() => {
					fs.chmodSync(String(e.absolute), Number(e.mode));
				}) : [];
				return this[MAKEFS](t, e);
			}
			let [t] = callSync(() => fs.rmdirSync(String(e.absolute)));
			this[MAKEFS](t, e);
		}
		let [r] = e.absolute === this.cwd ? [] : callSync(() => unlinkFileSync(String(e.absolute)));
		this[MAKEFS](r, e);
	}
	[FILE](e, t) {
		let n = typeof e.mode == `number` ? e.mode & 4095 : this.fmode, r = (n) => {
			let r;
			try {
				fs.closeSync(i);
			} catch (e) {
				r = e;
			}
			(n || r) && this[ONERROR](n || r, e), t();
		}, i;
		try {
			i = fs.openSync(String(e.absolute), getWriteFlag(e.size), n);
		} catch (e) {
			return r(e);
		}
		let a = this.transform && this.transform(e) || e;
		a !== e && (a.on(`error`, (t) => this[ONERROR](t, e)), e.pipe(a)), a.on(`data`, (e) => {
			try {
				fs.writeSync(i, e, 0, e.length);
			} catch (e) {
				r(e);
			}
		}), a.on(`end`, () => {
			let t = null;
			if (e.mtime && !this.noMtime) {
				let n = e.atime || /* @__PURE__ */ new Date(), r = e.mtime;
				try {
					fs.futimesSync(i, n, r);
				} catch (i) {
					try {
						fs.utimesSync(String(e.absolute), n, r);
					} catch {
						t = i;
					}
				}
			}
			if (this[DOCHOWN](e)) {
				let n = this[UID](e), r = this[GID](e);
				try {
					fs.fchownSync(i, Number(n), Number(r));
				} catch (i) {
					try {
						fs.chownSync(String(e.absolute), Number(n), Number(r));
					} catch {
						t ||= i;
					}
				}
			}
			r(t);
		});
	}
	[DIRECTORY](e, t) {
		let n = typeof e.mode == `number` ? e.mode & 4095 : this.dmode, r = this[MKDIR](String(e.absolute), n);
		if (r) {
			this[ONERROR](r, e), t();
			return;
		}
		if (e.mtime && !this.noMtime) try {
			fs.utimesSync(String(e.absolute), e.atime || /* @__PURE__ */ new Date(), e.mtime);
		} catch {}
		if (this[DOCHOWN](e)) try {
			fs.chownSync(String(e.absolute), Number(this[UID](e)), Number(this[GID](e)));
		} catch {}
		t(), e.resume();
	}
	[MKDIR](e, t) {
		try {
			return mkdirSync(normalizeWindowsPath(e), {
				uid: this.uid,
				gid: this.gid,
				processUid: this.processUid,
				processGid: this.processGid,
				umask: this.processUmask,
				preserve: this.preservePaths,
				unlink: this.unlink,
				cwd: this.cwd,
				mode: t
			});
		} catch (e) {
			return e;
		}
	}
	[LINK](e, t, n, r) {
		let i = `${n}Sync`;
		try {
			fs[i](t, String(e.absolute)), r(), e.resume();
		} catch (t) {
			return this[ONERROR](t, e);
		}
	}
};
const extract = makeCommand((e) => {
	let t = new UnpackSync(e), n = e.file, i = fs.statSync(n);
	new ReadStreamSync(n, {
		readSize: e.maxReadSize || 16 * 1024 * 1024,
		size: i.size
	}).pipe(t);
}, (e, t) => {
	let n = new Unpack(e), r = e.maxReadSize || 16 * 1024 * 1024, i = e.file;
	return new Promise((e, t) => {
		n.on(`error`, t), n.on(`close`, e), fs.stat(i, (e, o) => {
			if (e) t(e);
			else {
				let e = new ReadStream(i, {
					readSize: r,
					size: o.size
				});
				e.on(`error`, t), e.pipe(n);
			}
		});
	});
}, (e) => new UnpackSync(e), (e) => new Unpack(e), (e, t) => {
	t?.length && filesFilter(e, t);
}), replaceSync = (e, t) => {
	let n = new PackSync(e), r = !0, i, a;
	try {
		try {
			i = fs.openSync(e.file, `r+`);
		} catch (t) {
			if (t?.code === `ENOENT`) i = fs.openSync(e.file, `w+`);
			else throw t;
		}
		let o = fs.fstatSync(i), s = Buffer.alloc(512);
		POSITION: for (a = 0; a < o.size; a += 512) {
			for (let e = 0, t = 0; e < 512; e += t) {
				if (t = fs.readSync(i, s, e, s.length - e, a + e), a === 0 && s[0] === 31 && s[1] === 139) throw Error(`cannot append to compressed archives`);
				if (!t) break POSITION;
			}
			let t = new Header(s);
			if (!t.cksumValid) break;
			let n = 512 * Math.ceil((t.size || 0) / 512);
			if (a + n + 512 > o.size) break;
			a += n, e.mtimeCache && t.mtime && e.mtimeCache.set(String(t.path), t.mtime);
		}
		r = !1, streamSync(e, n, a, i, t);
	} finally {
		if (r) try {
			fs.closeSync(i);
		} catch {}
	}
}, streamSync = (e, t, r, i, a) => {
	let o = new WriteStreamSync(e.file, {
		fd: i,
		start: r
	});
	t.pipe(o), addFilesSync(t, a);
}, replaceAsync = (e, t) => {
	t = Array.from(t);
	let n = new Pack(e), r = (t, n, r) => {
		let i = (e, n) => {
			e ? fs.close(t, (t) => r(e)) : r(null, n);
		}, a = 0;
		if (n === 0) return i(null, 0);
		let o = 0, s = Buffer.alloc(512), c = (r, l) => {
			if (r || l === void 0) return i(r);
			if (o += l, o < 512 && l) return fs.read(t, s, o, s.length - o, a + o, c);
			if (a === 0 && s[0] === 31 && s[1] === 139) return i(Error(`cannot append to compressed archives`));
			if (o < 512) return i(null, a);
			let u = new Header(s);
			if (!u.cksumValid) return i(null, a);
			let d = 512 * Math.ceil((u.size ?? 0) / 512);
			if (a + d + 512 > n || (a += d + 512, a >= n)) return i(null, a);
			e.mtimeCache && u.mtime && e.mtimeCache.set(String(u.path), u.mtime), o = 0, fs.read(t, s, 0, 512, a, c);
		};
		fs.read(t, s, 0, 512, a, c);
	};
	return new Promise((a, o) => {
		n.on(`error`, o);
		let s = `r+`, c = (l, u) => {
			if (l && l.code === `ENOENT` && s === `r+`) return s = `w+`, fs.open(e.file, s, c);
			if (l || !u) return o(l);
			fs.fstat(u, (s, c) => {
				if (s) return fs.close(u, () => o(s));
				r(u, c.size, (r, s) => {
					if (r) return o(r);
					let c = new WriteStream(e.file, {
						fd: u,
						start: s
					});
					n.pipe(c), c.on(`error`, o), c.on(`close`, a), addFilesAsync(n, t);
				});
			});
		};
		fs.open(e.file, s, c);
	});
}, addFilesSync = (e, t) => {
	t.forEach((t) => {
		t.charAt(0) === `@` ? list({
			file: path.resolve(e.cwd, t.slice(1)),
			sync: !0,
			noResume: !0,
			onReadEntry: (t) => e.add(t)
		}) : e.add(t);
	}), e.end();
}, addFilesAsync = async (e, t) => {
	for (let n = 0; n < t.length; n++) {
		let r = String(t[n]);
		r.charAt(0) === `@` ? await list({
			file: path.resolve(String(e.cwd), r.slice(1)),
			noResume: !0,
			onReadEntry: (t) => e.add(t)
		}) : e.add(r);
	}
	e.end();
}, replace = makeCommand(replaceSync, replaceAsync, () => {
	throw TypeError(`file is required`);
}, () => {
	throw TypeError(`file is required`);
}, (e, t) => {
	if (!isFile(e)) throw TypeError(`file is required`);
	if (e.gzip || e.brotli || e.zstd || e.file.endsWith(`.br`) || e.file.endsWith(`.tbr`)) throw TypeError(`cannot append to compressed archives`);
	if (!t?.length) throw TypeError(`no paths specified to add/replace`);
});
makeCommand(replace.syncFile, replace.asyncFile, replace.syncNoFile, replace.asyncNoFile, (e, t = []) => {
	replace.validate?.(e, t), mtimeFilter(e);
});
const mtimeFilter = (e) => {
	let t = e.filter;
	e.mtimeCache ||= /* @__PURE__ */ new Map(), e.filter = t ? (n, r) => t(n, r) && !((e.mtimeCache?.get(n) ?? r.mtime ?? 0) > (r.mtime ?? 0)) : (t, n) => !((e.mtimeCache?.get(t) ?? n.mtime ?? 0) > (n.mtime ?? 0));
};
var esm_exports = __exportAll({
	Header: () => Header,
	Pack: () => Pack,
	PackJob: () => PackJob,
	PackSync: () => PackSync,
	Parser: () => Parser,
	Pax: () => Pax,
	ReadEntry: () => ReadEntry,
	Unpack: () => Unpack,
	UnpackSync: () => UnpackSync,
	WriteEntry: () => WriteEntry,
	WriteEntrySync: () => WriteEntrySync,
	WriteEntryTar: () => WriteEntryTar,
	extract: () => extract,
	filesFilter: () => filesFilter,
	list: () => list,
	replace: () => replace
});
export { esm_exports as t };
