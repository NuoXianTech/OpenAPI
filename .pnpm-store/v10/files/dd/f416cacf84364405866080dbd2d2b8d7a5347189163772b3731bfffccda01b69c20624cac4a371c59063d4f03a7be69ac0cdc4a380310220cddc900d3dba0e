import Stream from "node:stream";
import EE from "events";
import fs from "fs";
import { EventEmitter as EventEmitter$1 } from "node:events";
import { StringDecoder } from "node:string_decoder";
const proc = typeof process == `object` && process ? process : {
	stdout: null,
	stderr: null
}, isStream = (t) => !!t && typeof t == `object` && (t instanceof Minipass || t instanceof Stream || isReadable(t) || isWritable(t)), isReadable = (t) => !!t && typeof t == `object` && t instanceof EventEmitter$1 && typeof t.pipe == `function` && t.pipe !== Stream.Writable.prototype.pipe, isWritable = (e) => !!e && typeof e == `object` && e instanceof EventEmitter$1 && typeof e.write == `function` && typeof e.end == `function`, EOF = Symbol(`EOF`), MAYBE_EMIT_END = Symbol(`maybeEmitEnd`), EMITTED_END = Symbol(`emittedEnd`), EMITTING_END = Symbol(`emittingEnd`), EMITTED_ERROR = Symbol(`emittedError`), CLOSED = Symbol(`closed`), READ = Symbol(`read`), FLUSH = Symbol(`flush`), FLUSHCHUNK = Symbol(`flushChunk`), ENCODING = Symbol(`encoding`), DECODER = Symbol(`decoder`), FLOWING = Symbol(`flowing`), PAUSED = Symbol(`paused`), RESUME = Symbol(`resume`), BUFFER = Symbol(`buffer`), PIPES = Symbol(`pipes`), BUFFERLENGTH = Symbol(`bufferLength`), BUFFERPUSH = Symbol(`bufferPush`), BUFFERSHIFT = Symbol(`bufferShift`), OBJECTMODE = Symbol(`objectMode`), DESTROYED = Symbol(`destroyed`), ERROR = Symbol(`error`), EMITDATA = Symbol(`emitData`), EMITEND = Symbol(`emitEnd`), EMITEND2 = Symbol(`emitEnd2`), ASYNC = Symbol(`async`), ABORT = Symbol(`abort`), ABORTED = Symbol(`aborted`), SIGNAL = Symbol(`signal`), DATALISTENERS = Symbol(`dataListeners`), DISCARDED = Symbol(`discarded`), defer = (e) => Promise.resolve().then(e), nodefer = (e) => e(), isEndish = (e) => e === `end` || e === `finish` || e === `prefinish`, isArrayBufferLike = (e) => e instanceof ArrayBuffer || !!e && typeof e == `object` && e.constructor && e.constructor.name === `ArrayBuffer` && e.byteLength >= 0, isArrayBufferView = (e) => !Buffer.isBuffer(e) && ArrayBuffer.isView(e);
var Pipe = class {
	src;
	dest;
	opts;
	ondrain;
	constructor(e, t, n) {
		this.src = e, this.dest = t, this.opts = n, this.ondrain = () => e[RESUME](), this.dest.on(`drain`, this.ondrain);
	}
	unpipe() {
		this.dest.removeListener(`drain`, this.ondrain);
	}
	proxyErrors(e) {}
	end() {
		this.unpipe(), this.opts.end && this.dest.end();
	}
}, PipeProxyErrors = class extends Pipe {
	unpipe() {
		this.src.removeListener(`error`, this.proxyErrors), super.unpipe();
	}
	constructor(e, t, n) {
		super(e, t, n), this.proxyErrors = (e) => t.emit(`error`, e), e.on(`error`, this.proxyErrors);
	}
};
const isObjectModeOptions = (e) => !!e.objectMode, isEncodingOptions = (e) => !e.objectMode && !!e.encoding && e.encoding !== `buffer`;
var Minipass = class extends EventEmitter$1 {
	[FLOWING] = !1;
	[PAUSED] = !1;
	[PIPES] = [];
	[BUFFER] = [];
	[OBJECTMODE];
	[ENCODING];
	[ASYNC];
	[DECODER];
	[EOF] = !1;
	[EMITTED_END] = !1;
	[EMITTING_END] = !1;
	[CLOSED] = !1;
	[EMITTED_ERROR] = null;
	[BUFFERLENGTH] = 0;
	[DESTROYED] = !1;
	[SIGNAL];
	[ABORTED] = !1;
	[DATALISTENERS] = 0;
	[DISCARDED] = !1;
	writable = !0;
	readable = !0;
	constructor(...e) {
		let t = e[0] || {};
		if (super(), t.objectMode && typeof t.encoding == `string`) throw TypeError(`Encoding and objectMode may not be used together`);
		isObjectModeOptions(t) ? (this[OBJECTMODE] = !0, this[ENCODING] = null) : isEncodingOptions(t) ? (this[ENCODING] = t.encoding, this[OBJECTMODE] = !1) : (this[OBJECTMODE] = !1, this[ENCODING] = null), this[ASYNC] = !!t.async, this[DECODER] = this[ENCODING] ? new StringDecoder(this[ENCODING]) : null, t && t.debugExposeBuffer === !0 && Object.defineProperty(this, `buffer`, { get: () => this[BUFFER] }), t && t.debugExposePipes === !0 && Object.defineProperty(this, `pipes`, { get: () => this[PIPES] });
		let { signal: n } = t;
		n && (this[SIGNAL] = n, n.aborted ? this[ABORT]() : n.addEventListener(`abort`, () => this[ABORT]()));
	}
	get bufferLength() {
		return this[BUFFERLENGTH];
	}
	get encoding() {
		return this[ENCODING];
	}
	set encoding(e) {
		throw Error(`Encoding must be set at instantiation time`);
	}
	setEncoding(e) {
		throw Error(`Encoding must be set at instantiation time`);
	}
	get objectMode() {
		return this[OBJECTMODE];
	}
	set objectMode(e) {
		throw Error(`objectMode must be set at instantiation time`);
	}
	get async() {
		return this[ASYNC];
	}
	set async(e) {
		this[ASYNC] = this[ASYNC] || !!e;
	}
	[ABORT]() {
		this[ABORTED] = !0, this.emit(`abort`, this[SIGNAL]?.reason), this.destroy(this[SIGNAL]?.reason);
	}
	get aborted() {
		return this[ABORTED];
	}
	set aborted(e) {}
	write(e, t, n) {
		if (this[ABORTED]) return !1;
		if (this[EOF]) throw Error(`write after end`);
		if (this[DESTROYED]) return this.emit(`error`, Object.assign(Error(`Cannot call write after a stream was destroyed`), { code: `ERR_STREAM_DESTROYED` })), !0;
		typeof t == `function` && (n = t, t = `utf8`), t ||= `utf8`;
		let r = this[ASYNC] ? defer : nodefer;
		if (!this[OBJECTMODE] && !Buffer.isBuffer(e)) {
			if (isArrayBufferView(e)) e = Buffer.from(e.buffer, e.byteOffset, e.byteLength);
			else if (isArrayBufferLike(e)) e = Buffer.from(e);
			else if (typeof e != `string`) throw Error(`Non-contiguous data written to non-objectMode stream`);
		}
		return this[OBJECTMODE] ? (this[FLOWING] && this[BUFFERLENGTH] !== 0 && this[FLUSH](!0), this[FLOWING] ? this.emit(`data`, e) : this[BUFFERPUSH](e), this[BUFFERLENGTH] !== 0 && this.emit(`readable`), n && r(n), this[FLOWING]) : e.length ? (typeof e == `string` && !(t === this[ENCODING] && !this[DECODER]?.lastNeed) && (e = Buffer.from(e, t)), Buffer.isBuffer(e) && this[ENCODING] && (e = this[DECODER].write(e)), this[FLOWING] && this[BUFFERLENGTH] !== 0 && this[FLUSH](!0), this[FLOWING] ? this.emit(`data`, e) : this[BUFFERPUSH](e), this[BUFFERLENGTH] !== 0 && this.emit(`readable`), n && r(n), this[FLOWING]) : (this[BUFFERLENGTH] !== 0 && this.emit(`readable`), n && r(n), this[FLOWING]);
	}
	read(e) {
		if (this[DESTROYED]) return null;
		if (this[DISCARDED] = !1, this[BUFFERLENGTH] === 0 || e === 0 || e && e > this[BUFFERLENGTH]) return this[MAYBE_EMIT_END](), null;
		this[OBJECTMODE] && (e = null), this[BUFFER].length > 1 && !this[OBJECTMODE] && (this[BUFFER] = [this[ENCODING] ? this[BUFFER].join(``) : Buffer.concat(this[BUFFER], this[BUFFERLENGTH])]);
		let t = this[READ](e || null, this[BUFFER][0]);
		return this[MAYBE_EMIT_END](), t;
	}
	[READ](e, t) {
		if (this[OBJECTMODE]) this[BUFFERSHIFT]();
		else {
			let n = t;
			e === n.length || e === null ? this[BUFFERSHIFT]() : typeof n == `string` ? (this[BUFFER][0] = n.slice(e), t = n.slice(0, e), this[BUFFERLENGTH] -= e) : (this[BUFFER][0] = n.subarray(e), t = n.subarray(0, e), this[BUFFERLENGTH] -= e);
		}
		return this.emit(`data`, t), !this[BUFFER].length && !this[EOF] && this.emit(`drain`), t;
	}
	end(e, t, n) {
		return typeof e == `function` && (n = e, e = void 0), typeof t == `function` && (n = t, t = `utf8`), e !== void 0 && this.write(e, t), n && this.once(`end`, n), this[EOF] = !0, this.writable = !1, (this[FLOWING] || !this[PAUSED]) && this[MAYBE_EMIT_END](), this;
	}
	[RESUME]() {
		this[DESTROYED] || (!this[DATALISTENERS] && !this[PIPES].length && (this[DISCARDED] = !0), this[PAUSED] = !1, this[FLOWING] = !0, this.emit(`resume`), this[BUFFER].length ? this[FLUSH]() : this[EOF] ? this[MAYBE_EMIT_END]() : this.emit(`drain`));
	}
	resume() {
		return this[RESUME]();
	}
	pause() {
		this[FLOWING] = !1, this[PAUSED] = !0, this[DISCARDED] = !1;
	}
	get destroyed() {
		return this[DESTROYED];
	}
	get flowing() {
		return this[FLOWING];
	}
	get paused() {
		return this[PAUSED];
	}
	[BUFFERPUSH](e) {
		this[OBJECTMODE] ? this[BUFFERLENGTH] += 1 : this[BUFFERLENGTH] += e.length, this[BUFFER].push(e);
	}
	[BUFFERSHIFT]() {
		return this[OBJECTMODE] ? --this[BUFFERLENGTH] : this[BUFFERLENGTH] -= this[BUFFER][0].length, this[BUFFER].shift();
	}
	[FLUSH](e = !1) {
		do		;
while (this[FLUSHCHUNK](this[BUFFERSHIFT]()) && this[BUFFER].length);
		!e && !this[BUFFER].length && !this[EOF] && this.emit(`drain`);
	}
	[FLUSHCHUNK](e) {
		return this.emit(`data`, e), this[FLOWING];
	}
	pipe(e, t) {
		if (this[DESTROYED]) return e;
		this[DISCARDED] = !1;
		let n = this[EMITTED_END];
		return t ||= {}, e === proc.stdout || e === proc.stderr ? t.end = !1 : t.end = t.end !== !1, t.proxyErrors = !!t.proxyErrors, n ? t.end && e.end() : (this[PIPES].push(t.proxyErrors ? new PipeProxyErrors(this, e, t) : new Pipe(this, e, t)), this[ASYNC] ? defer(() => this[RESUME]()) : this[RESUME]()), e;
	}
	unpipe(e) {
		let t = this[PIPES].find((t) => t.dest === e);
		t && (this[PIPES].length === 1 ? (this[FLOWING] && this[DATALISTENERS] === 0 && (this[FLOWING] = !1), this[PIPES] = []) : this[PIPES].splice(this[PIPES].indexOf(t), 1), t.unpipe());
	}
	addListener(e, t) {
		return this.on(e, t);
	}
	on(e, t) {
		let n = super.on(e, t);
		if (e === `data`) this[DISCARDED] = !1, this[DATALISTENERS]++, !this[PIPES].length && !this[FLOWING] && this[RESUME]();
		else if (e === `readable` && this[BUFFERLENGTH] !== 0) super.emit(`readable`);
		else if (isEndish(e) && this[EMITTED_END]) super.emit(e), this.removeAllListeners(e);
		else if (e === `error` && this[EMITTED_ERROR]) {
			let e = t;
			this[ASYNC] ? defer(() => e.call(this, this[EMITTED_ERROR])) : e.call(this, this[EMITTED_ERROR]);
		}
		return n;
	}
	removeListener(e, t) {
		return this.off(e, t);
	}
	off(e, t) {
		let n = super.off(e, t);
		return e === `data` && (this[DATALISTENERS] = this.listeners(`data`).length, this[DATALISTENERS] === 0 && !this[DISCARDED] && !this[PIPES].length && (this[FLOWING] = !1)), n;
	}
	removeAllListeners(e) {
		let t = super.removeAllListeners(e);
		return (e === `data` || e === void 0) && (this[DATALISTENERS] = 0, !this[DISCARDED] && !this[PIPES].length && (this[FLOWING] = !1)), t;
	}
	get emittedEnd() {
		return this[EMITTED_END];
	}
	[MAYBE_EMIT_END]() {
		!this[EMITTING_END] && !this[EMITTED_END] && !this[DESTROYED] && this[BUFFER].length === 0 && this[EOF] && (this[EMITTING_END] = !0, this.emit(`end`), this.emit(`prefinish`), this.emit(`finish`), this[CLOSED] && this.emit(`close`), this[EMITTING_END] = !1);
	}
	emit(e, ...t) {
		let n = t[0];
		if (e !== `error` && e !== `close` && e !== DESTROYED && this[DESTROYED]) return !1;
		if (e === `data`) return !this[OBJECTMODE] && !n ? !1 : this[ASYNC] ? (defer(() => this[EMITDATA](n)), !0) : this[EMITDATA](n);
		if (e === `end`) return this[EMITEND]();
		if (e === `close`) {
			if (this[CLOSED] = !0, !this[EMITTED_END] && !this[DESTROYED]) return !1;
			let e = super.emit(`close`);
			return this.removeAllListeners(`close`), e;
		} else if (e === `error`) {
			this[EMITTED_ERROR] = n, super.emit(ERROR, n);
			let e = !this[SIGNAL] || this.listeners(`error`).length ? super.emit(`error`, n) : !1;
			return this[MAYBE_EMIT_END](), e;
		} else if (e === `resume`) {
			let e = super.emit(`resume`);
			return this[MAYBE_EMIT_END](), e;
		} else if (e === `finish` || e === `prefinish`) {
			let t = super.emit(e);
			return this.removeAllListeners(e), t;
		}
		let r = super.emit(e, ...t);
		return this[MAYBE_EMIT_END](), r;
	}
	[EMITDATA](e) {
		for (let t of this[PIPES]) t.dest.write(e) === !1 && this.pause();
		let t = this[DISCARDED] ? !1 : super.emit(`data`, e);
		return this[MAYBE_EMIT_END](), t;
	}
	[EMITEND]() {
		return this[EMITTED_END] ? !1 : (this[EMITTED_END] = !0, this.readable = !1, this[ASYNC] ? (defer(() => this[EMITEND2]()), !0) : this[EMITEND2]());
	}
	[EMITEND2]() {
		if (this[DECODER]) {
			let e = this[DECODER].end();
			if (e) {
				for (let t of this[PIPES]) t.dest.write(e);
				this[DISCARDED] || super.emit(`data`, e);
			}
		}
		for (let e of this[PIPES]) e.end();
		let e = super.emit(`end`);
		return this.removeAllListeners(`end`), e;
	}
	async collect() {
		let e = Object.assign([], { dataLength: 0 });
		this[OBJECTMODE] || (e.dataLength = 0);
		let t = this.promise();
		return this.on(`data`, (t) => {
			e.push(t), this[OBJECTMODE] || (e.dataLength += t.length);
		}), await t, e;
	}
	async concat() {
		if (this[OBJECTMODE]) throw Error(`cannot concat in objectMode`);
		let e = await this.collect();
		return this[ENCODING] ? e.join(``) : Buffer.concat(e, e.dataLength);
	}
	async promise() {
		return new Promise((e, t) => {
			this.on(DESTROYED, () => t(Error(`stream destroyed`))), this.on(`error`, (e) => t(e)), this.on(`end`, () => e());
		});
	}
	[Symbol.asyncIterator]() {
		this[DISCARDED] = !1;
		let e = !1, t = async () => (this.pause(), e = !0, {
			value: void 0,
			done: !0
		});
		return {
			next: () => {
				if (e) return t();
				let n = this.read();
				if (n !== null) return Promise.resolve({
					done: !1,
					value: n
				});
				if (this[EOF]) return t();
				let r, i, a = (e) => {
					this.off(`data`, o), this.off(`end`, s), this.off(DESTROYED, c), t(), i(e);
				}, o = (e) => {
					this.off(`error`, a), this.off(`end`, s), this.off(DESTROYED, c), this.pause(), r({
						value: e,
						done: !!this[EOF]
					});
				}, s = () => {
					this.off(`error`, a), this.off(`data`, o), this.off(DESTROYED, c), t(), r({
						done: !0,
						value: void 0
					});
				}, c = () => a(Error(`stream destroyed`));
				return new Promise((e, t) => {
					i = t, r = e, this.once(DESTROYED, c), this.once(`error`, a), this.once(`end`, s), this.once(`data`, o);
				});
			},
			throw: t,
			return: t,
			[Symbol.asyncIterator]() {
				return this;
			}
		};
	}
	[Symbol.iterator]() {
		this[DISCARDED] = !1;
		let e = !1, t = () => (this.pause(), this.off(ERROR, t), this.off(DESTROYED, t), this.off(`end`, t), e = !0, {
			done: !0,
			value: void 0
		});
		return this.once(`end`, t), this.once(ERROR, t), this.once(DESTROYED, t), {
			next: () => {
				if (e) return t();
				let n = this.read();
				return n === null ? t() : {
					done: !1,
					value: n
				};
			},
			throw: t,
			return: t,
			[Symbol.iterator]() {
				return this;
			}
		};
	}
	destroy(e) {
		if (this[DESTROYED]) return e ? this.emit(`error`, e) : this.emit(DESTROYED), this;
		this[DESTROYED] = !0, this[DISCARDED] = !0, this[BUFFER].length = 0, this[BUFFERLENGTH] = 0;
		let t = this;
		return typeof t.close == `function` && !this[CLOSED] && t.close(), e ? this.emit(`error`, e) : this.emit(DESTROYED), this;
	}
	static get isStream() {
		return isStream;
	}
};
const writev = fs.writev, _autoClose = Symbol(`_autoClose`), _close = Symbol(`_close`), _ended = Symbol(`_ended`), _fd = Symbol(`_fd`), _finished = Symbol(`_finished`), _flags = Symbol(`_flags`), _flush = Symbol(`_flush`), _handleChunk = Symbol(`_handleChunk`), _makeBuf = Symbol(`_makeBuf`), _mode = Symbol(`_mode`), _needDrain = Symbol(`_needDrain`), _onerror = Symbol(`_onerror`), _onopen = Symbol(`_onopen`), _onread = Symbol(`_onread`), _onwrite = Symbol(`_onwrite`), _open = Symbol(`_open`), _path = Symbol(`_path`), _pos = Symbol(`_pos`), _queue = Symbol(`_queue`), _read = Symbol(`_read`), _readSize = Symbol(`_readSize`), _reading = Symbol(`_reading`), _remain = Symbol(`_remain`), _size = Symbol(`_size`), _write = Symbol(`_write`), _writing = Symbol(`_writing`), _defaultFlag = Symbol(`_defaultFlag`), _errored = Symbol(`_errored`);
var ReadStream = class extends Minipass {
	[_errored] = !1;
	[_fd];
	[_path];
	[_readSize];
	[_reading] = !1;
	[_size];
	[_remain];
	[_autoClose];
	constructor(e, t) {
		if (t ||= {}, super(t), this.readable = !0, this.writable = !1, typeof e != `string`) throw TypeError(`path must be a string`);
		this[_errored] = !1, this[_fd] = typeof t.fd == `number` ? t.fd : void 0, this[_path] = e, this[_readSize] = t.readSize || 16 * 1024 * 1024, this[_reading] = !1, this[_size] = typeof t.size == `number` ? t.size : Infinity, this[_remain] = this[_size], this[_autoClose] = typeof t.autoClose == `boolean` ? t.autoClose : !0, typeof this[_fd] == `number` ? this[_read]() : this[_open]();
	}
	get fd() {
		return this[_fd];
	}
	get path() {
		return this[_path];
	}
	write() {
		throw TypeError(`this is a readable stream`);
	}
	end() {
		throw TypeError(`this is a readable stream`);
	}
	[_open]() {
		fs.open(this[_path], `r`, (e, t) => this[_onopen](e, t));
	}
	[_onopen](e, t) {
		e ? this[_onerror](e) : (this[_fd] = t, this.emit(`open`, t), this[_read]());
	}
	[_makeBuf]() {
		return Buffer.allocUnsafe(Math.min(this[_readSize], this[_remain]));
	}
	[_read]() {
		if (!this[_reading]) {
			this[_reading] = !0;
			let e = this[_makeBuf]();
			if (e.length === 0) return process.nextTick(() => this[_onread](null, 0, e));
			fs.read(this[_fd], e, 0, e.length, null, (e, t, n) => this[_onread](e, t, n));
		}
	}
	[_onread](e, t, n) {
		this[_reading] = !1, e ? this[_onerror](e) : this[_handleChunk](t, n) && this[_read]();
	}
	[_close]() {
		if (this[_autoClose] && typeof this[_fd] == `number`) {
			let e = this[_fd];
			this[_fd] = void 0, fs.close(e, (e) => e ? this.emit(`error`, e) : this.emit(`close`));
		}
	}
	[_onerror](e) {
		this[_reading] = !0, this[_close](), this.emit(`error`, e);
	}
	[_handleChunk](e, t) {
		let n = !1;
		return this[_remain] -= e, e > 0 && (n = super.write(e < t.length ? t.subarray(0, e) : t)), (e === 0 || this[_remain] <= 0) && (n = !1, this[_close](), super.end()), n;
	}
	emit(e, ...t) {
		switch (e) {
			case `prefinish`:
			case `finish`: return !1;
			case `drain`: return typeof this[_fd] == `number` && this[_read](), !1;
			case `error`: return this[_errored] ? !1 : (this[_errored] = !0, super.emit(e, ...t));
			default: return super.emit(e, ...t);
		}
	}
}, ReadStreamSync = class extends ReadStream {
	[_open]() {
		let e = !0;
		try {
			this[_onopen](null, fs.openSync(this[_path], `r`)), e = !1;
		} finally {
			e && this[_close]();
		}
	}
	[_read]() {
		let e = !0;
		try {
			if (!this[_reading]) {
				this[_reading] = !0;
				do {
					let e = this[_makeBuf](), t = e.length === 0 ? 0 : fs.readSync(this[_fd], e, 0, e.length, null);
					if (!this[_handleChunk](t, e)) break;
				} while (!0);
				this[_reading] = !1;
			}
			e = !1;
		} finally {
			e && this[_close]();
		}
	}
	[_close]() {
		if (this[_autoClose] && typeof this[_fd] == `number`) {
			let e = this[_fd];
			this[_fd] = void 0, fs.closeSync(e), this.emit(`close`);
		}
	}
}, WriteStream = class extends EE {
	readable = !1;
	writable = !0;
	[_errored] = !1;
	[_writing] = !1;
	[_ended] = !1;
	[_queue] = [];
	[_needDrain] = !1;
	[_path];
	[_mode];
	[_autoClose];
	[_fd];
	[_defaultFlag];
	[_flags];
	[_finished] = !1;
	[_pos];
	constructor(e, t) {
		t ||= {}, super(t), this[_path] = e, this[_fd] = typeof t.fd == `number` ? t.fd : void 0, this[_mode] = t.mode === void 0 ? 438 : t.mode, this[_pos] = typeof t.start == `number` ? t.start : void 0, this[_autoClose] = typeof t.autoClose == `boolean` ? t.autoClose : !0;
		let n = this[_pos] === void 0 ? `w` : `r+`;
		this[_defaultFlag] = t.flags === void 0, this[_flags] = t.flags === void 0 ? n : t.flags, this[_fd] === void 0 && this[_open]();
	}
	emit(e, ...t) {
		if (e === `error`) {
			if (this[_errored]) return !1;
			this[_errored] = !0;
		}
		return super.emit(e, ...t);
	}
	get fd() {
		return this[_fd];
	}
	get path() {
		return this[_path];
	}
	[_onerror](e) {
		this[_close](), this[_writing] = !0, this.emit(`error`, e);
	}
	[_open]() {
		fs.open(this[_path], this[_flags], this[_mode], (e, t) => this[_onopen](e, t));
	}
	[_onopen](e, t) {
		this[_defaultFlag] && this[_flags] === `r+` && e && e.code === `ENOENT` ? (this[_flags] = `w`, this[_open]()) : e ? this[_onerror](e) : (this[_fd] = t, this.emit(`open`, t), this[_writing] || this[_flush]());
	}
	end(e, t) {
		return e && this.write(e, t), this[_ended] = !0, !this[_writing] && !this[_queue].length && typeof this[_fd] == `number` && this[_onwrite](null, 0), this;
	}
	write(e, t) {
		return typeof e == `string` && (e = Buffer.from(e, t)), this[_ended] ? (this.emit(`error`, Error(`write() after end()`)), !1) : this[_fd] === void 0 || this[_writing] || this[_queue].length ? (this[_queue].push(e), this[_needDrain] = !0, !1) : (this[_writing] = !0, this[_write](e), !0);
	}
	[_write](e) {
		fs.write(this[_fd], e, 0, e.length, this[_pos], (e, t) => this[_onwrite](e, t));
	}
	[_onwrite](e, t) {
		e ? this[_onerror](e) : (this[_pos] !== void 0 && typeof t == `number` && (this[_pos] += t), this[_queue].length ? this[_flush]() : (this[_writing] = !1, this[_ended] && !this[_finished] ? (this[_finished] = !0, this[_close](), this.emit(`finish`)) : this[_needDrain] && (this[_needDrain] = !1, this.emit(`drain`))));
	}
	[_flush]() {
		if (this[_queue].length === 0) this[_ended] && this[_onwrite](null, 0);
		else if (this[_queue].length === 1) this[_write](this[_queue].pop());
		else {
			let e = this[_queue];
			this[_queue] = [], writev(this[_fd], e, this[_pos], (e, t) => this[_onwrite](e, t));
		}
	}
	[_close]() {
		if (this[_autoClose] && typeof this[_fd] == `number`) {
			let e = this[_fd];
			this[_fd] = void 0, fs.close(e, (e) => e ? this.emit(`error`, e) : this.emit(`close`));
		}
	}
}, WriteStreamSync = class extends WriteStream {
	[_open]() {
		let e;
		if (this[_defaultFlag] && this[_flags] === `r+`) try {
			e = fs.openSync(this[_path], this[_flags], this[_mode]);
		} catch (e) {
			if (e?.code === `ENOENT`) return this[_flags] = `w`, this[_open]();
			throw e;
		}
		else e = fs.openSync(this[_path], this[_flags], this[_mode]);
		this[_onopen](null, e);
	}
	[_close]() {
		if (this[_autoClose] && typeof this[_fd] == `number`) {
			let e = this[_fd];
			this[_fd] = void 0, fs.closeSync(e), this.emit(`close`);
		}
	}
	[_write](e) {
		let t = !0;
		try {
			this[_onwrite](null, fs.writeSync(this[_fd], e, 0, e.length, this[_pos])), t = !1;
		} finally {
			if (t) try {
				this[_close]();
			} catch {}
		}
	}
};
export { Minipass as a, WriteStreamSync as i, ReadStreamSync as n, WriteStream as r, ReadStream as t };
