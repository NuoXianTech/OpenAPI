import { a as Minipass } from "./@isaacs/fs-minipass.mjs";
import assert from "assert";
import { Buffer } from "buffer";
import * as realZlib$1 from "zlib";
import realZlib from "zlib";
const realZlibConstants = realZlib.constants || { ZLIB_VERNUM: 4736 }, constants = Object.freeze(Object.assign(Object.create(null), {
	Z_NO_FLUSH: 0,
	Z_PARTIAL_FLUSH: 1,
	Z_SYNC_FLUSH: 2,
	Z_FULL_FLUSH: 3,
	Z_FINISH: 4,
	Z_BLOCK: 5,
	Z_OK: 0,
	Z_STREAM_END: 1,
	Z_NEED_DICT: 2,
	Z_ERRNO: -1,
	Z_STREAM_ERROR: -2,
	Z_DATA_ERROR: -3,
	Z_MEM_ERROR: -4,
	Z_BUF_ERROR: -5,
	Z_VERSION_ERROR: -6,
	Z_NO_COMPRESSION: 0,
	Z_BEST_SPEED: 1,
	Z_BEST_COMPRESSION: 9,
	Z_DEFAULT_COMPRESSION: -1,
	Z_FILTERED: 1,
	Z_HUFFMAN_ONLY: 2,
	Z_RLE: 3,
	Z_FIXED: 4,
	Z_DEFAULT_STRATEGY: 0,
	DEFLATE: 1,
	INFLATE: 2,
	GZIP: 3,
	GUNZIP: 4,
	DEFLATERAW: 5,
	INFLATERAW: 6,
	UNZIP: 7,
	BROTLI_DECODE: 8,
	BROTLI_ENCODE: 9,
	Z_MIN_WINDOWBITS: 8,
	Z_MAX_WINDOWBITS: 15,
	Z_DEFAULT_WINDOWBITS: 15,
	Z_MIN_CHUNK: 64,
	Z_MAX_CHUNK: Infinity,
	Z_DEFAULT_CHUNK: 16384,
	Z_MIN_MEMLEVEL: 1,
	Z_MAX_MEMLEVEL: 9,
	Z_DEFAULT_MEMLEVEL: 8,
	Z_MIN_LEVEL: -1,
	Z_MAX_LEVEL: 9,
	Z_DEFAULT_LEVEL: -1,
	BROTLI_OPERATION_PROCESS: 0,
	BROTLI_OPERATION_FLUSH: 1,
	BROTLI_OPERATION_FINISH: 2,
	BROTLI_OPERATION_EMIT_METADATA: 3,
	BROTLI_MODE_GENERIC: 0,
	BROTLI_MODE_TEXT: 1,
	BROTLI_MODE_FONT: 2,
	BROTLI_DEFAULT_MODE: 0,
	BROTLI_MIN_QUALITY: 0,
	BROTLI_MAX_QUALITY: 11,
	BROTLI_DEFAULT_QUALITY: 11,
	BROTLI_MIN_WINDOW_BITS: 10,
	BROTLI_MAX_WINDOW_BITS: 24,
	BROTLI_LARGE_MAX_WINDOW_BITS: 30,
	BROTLI_DEFAULT_WINDOW: 22,
	BROTLI_MIN_INPUT_BLOCK_BITS: 16,
	BROTLI_MAX_INPUT_BLOCK_BITS: 24,
	BROTLI_PARAM_MODE: 0,
	BROTLI_PARAM_QUALITY: 1,
	BROTLI_PARAM_LGWIN: 2,
	BROTLI_PARAM_LGBLOCK: 3,
	BROTLI_PARAM_DISABLE_LITERAL_CONTEXT_MODELING: 4,
	BROTLI_PARAM_SIZE_HINT: 5,
	BROTLI_PARAM_LARGE_WINDOW: 6,
	BROTLI_PARAM_NPOSTFIX: 7,
	BROTLI_PARAM_NDIRECT: 8,
	BROTLI_DECODER_RESULT_ERROR: 0,
	BROTLI_DECODER_RESULT_SUCCESS: 1,
	BROTLI_DECODER_RESULT_NEEDS_MORE_INPUT: 2,
	BROTLI_DECODER_RESULT_NEEDS_MORE_OUTPUT: 3,
	BROTLI_DECODER_PARAM_DISABLE_RING_BUFFER_REALLOCATION: 0,
	BROTLI_DECODER_PARAM_LARGE_WINDOW: 1,
	BROTLI_DECODER_NO_ERROR: 0,
	BROTLI_DECODER_SUCCESS: 1,
	BROTLI_DECODER_NEEDS_MORE_INPUT: 2,
	BROTLI_DECODER_NEEDS_MORE_OUTPUT: 3,
	BROTLI_DECODER_ERROR_FORMAT_EXUBERANT_NIBBLE: -1,
	BROTLI_DECODER_ERROR_FORMAT_RESERVED: -2,
	BROTLI_DECODER_ERROR_FORMAT_EXUBERANT_META_NIBBLE: -3,
	BROTLI_DECODER_ERROR_FORMAT_SIMPLE_HUFFMAN_ALPHABET: -4,
	BROTLI_DECODER_ERROR_FORMAT_SIMPLE_HUFFMAN_SAME: -5,
	BROTLI_DECODER_ERROR_FORMAT_CL_SPACE: -6,
	BROTLI_DECODER_ERROR_FORMAT_HUFFMAN_SPACE: -7,
	BROTLI_DECODER_ERROR_FORMAT_CONTEXT_MAP_REPEAT: -8,
	BROTLI_DECODER_ERROR_FORMAT_BLOCK_LENGTH_1: -9,
	BROTLI_DECODER_ERROR_FORMAT_BLOCK_LENGTH_2: -10,
	BROTLI_DECODER_ERROR_FORMAT_TRANSFORM: -11,
	BROTLI_DECODER_ERROR_FORMAT_DICTIONARY: -12,
	BROTLI_DECODER_ERROR_FORMAT_WINDOW_BITS: -13,
	BROTLI_DECODER_ERROR_FORMAT_PADDING_1: -14,
	BROTLI_DECODER_ERROR_FORMAT_PADDING_2: -15,
	BROTLI_DECODER_ERROR_FORMAT_DISTANCE: -16,
	BROTLI_DECODER_ERROR_DICTIONARY_NOT_SET: -19,
	BROTLI_DECODER_ERROR_INVALID_ARGUMENTS: -20,
	BROTLI_DECODER_ERROR_ALLOC_CONTEXT_MODES: -21,
	BROTLI_DECODER_ERROR_ALLOC_TREE_GROUPS: -22,
	BROTLI_DECODER_ERROR_ALLOC_CONTEXT_MAP: -25,
	BROTLI_DECODER_ERROR_ALLOC_RING_BUFFER_1: -26,
	BROTLI_DECODER_ERROR_ALLOC_RING_BUFFER_2: -27,
	BROTLI_DECODER_ERROR_ALLOC_BLOCK_TYPE_TREES: -30,
	BROTLI_DECODER_ERROR_UNREACHABLE: -31
}, realZlibConstants)), OriginalBufferConcat = Buffer.concat, desc = Object.getOwnPropertyDescriptor(Buffer, `concat`), noop = (e) => e, passthroughBufferConcat = desc?.writable === !0 || desc?.set !== void 0 ? (e) => {
	Buffer.concat = e ? noop : OriginalBufferConcat;
} : (e) => {}, _superWrite = Symbol(`_superWrite`);
var ZlibError = class extends Error {
	code;
	errno;
	constructor(e, t) {
		super(`zlib: ` + e.message, { cause: e }), this.code = e.code, this.errno = e.errno, this.code ||= `ZLIB_ERROR`, this.message = `zlib: ` + e.message, Error.captureStackTrace(this, t ?? this.constructor);
	}
	get name() {
		return `ZlibError`;
	}
};
const _flushFlag = Symbol(`flushFlag`);
var ZlibBase = class extends Minipass {
	#sawError = !1;
	#ended = !1;
	#flushFlag;
	#finishFlushFlag;
	#fullFlushFlag;
	#handle;
	#onError;
	get sawError() {
		return this.#sawError;
	}
	get handle() {
		return this.#handle;
	}
	get flushFlag() {
		return this.#flushFlag;
	}
	constructor(e, t) {
		if (!e || typeof e != `object`) throw TypeError(`invalid options for ZlibBase constructor`);
		if (super(e), this.#flushFlag = e.flush ?? 0, this.#finishFlushFlag = e.finishFlush ?? 0, this.#fullFlushFlag = e.fullFlushFlag ?? 0, typeof realZlib$1[t] != `function`) throw TypeError(`Compression method not supported: ` + t);
		try {
			this.#handle = new realZlib$1[t](e);
		} catch (e) {
			throw new ZlibError(e, this.constructor);
		}
		this.#onError = (e) => {
			this.#sawError || (this.#sawError = !0, this.close(), this.emit(`error`, e));
		}, this.#handle?.on(`error`, (e) => this.#onError(new ZlibError(e))), this.once(`end`, () => this.close);
	}
	close() {
		this.#handle && (this.#handle.close(), this.#handle = void 0, this.emit(`close`));
	}
	reset() {
		if (!this.#sawError) return assert(this.#handle, `zlib binding closed`), this.#handle.reset?.();
	}
	flush(e) {
		this.ended || (typeof e != `number` && (e = this.#fullFlushFlag), this.write(Object.assign(Buffer.alloc(0), { [_flushFlag]: e })));
	}
	end(e, t, n) {
		return typeof e == `function` && (n = e, t = void 0, e = void 0), typeof t == `function` && (n = t, t = void 0), e && (t ? this.write(e, t) : this.write(e)), this.flush(this.#finishFlushFlag), this.#ended = !0, super.end(n);
	}
	get ended() {
		return this.#ended;
	}
	[_superWrite](e) {
		return super.write(e);
	}
	write(e, r, i) {
		if (typeof r == `function` && (i = r, r = `utf8`), typeof e == `string` && (e = Buffer.from(e, r)), this.#sawError) return;
		assert(this.#handle, `zlib binding closed`);
		let a = this.#handle._handle, o = a.close;
		a.close = () => {};
		let s = this.#handle.close;
		this.#handle.close = () => {}, passthroughBufferConcat(!0);
		let c;
		try {
			let t = typeof e[_flushFlag] == `number` ? e[_flushFlag] : this.#flushFlag;
			c = this.#handle._processChunk(e, t), passthroughBufferConcat(!1);
		} catch (e) {
			passthroughBufferConcat(!1), this.#onError(new ZlibError(e, this.write));
		} finally {
			this.#handle && (this.#handle._handle = a, a.close = o, this.#handle.close = s, this.#handle.removeAllListeners(`error`));
		}
		this.#handle && this.#handle.on(`error`, (e) => this.#onError(new ZlibError(e, this.write)));
		let l;
		if (c) if (Array.isArray(c) && c.length > 0) {
			let e = c[0];
			l = this[_superWrite](Buffer.from(e));
			for (let e = 1; e < c.length; e++) l = this[_superWrite](c[e]);
		} else l = this[_superWrite](Buffer.from(c));
		return i && i(), l;
	}
}, Zlib = class extends ZlibBase {
	#level;
	#strategy;
	constructor(e, t) {
		e ||= {}, e.flush = e.flush || constants.Z_NO_FLUSH, e.finishFlush = e.finishFlush || constants.Z_FINISH, e.fullFlushFlag = constants.Z_FULL_FLUSH, super(e, t), this.#level = e.level, this.#strategy = e.strategy;
	}
	params(e, n) {
		if (!this.sawError) {
			if (!this.handle) throw Error(`cannot switch params when binding is closed`);
			if (!this.handle.params) throw Error(`not supported in this implementation`);
			if (this.#level !== e || this.#strategy !== n) {
				this.flush(constants.Z_SYNC_FLUSH), assert(this.handle, `zlib binding closed`);
				let r = this.handle.flush;
				this.handle.flush = (e, t) => {
					typeof e == `function` && (t = e, e = this.flushFlag), this.flush(e), t?.();
				};
				try {
					this.handle.params(e, n);
				} finally {
					this.handle.flush = r;
				}
				this.handle && (this.#level = e, this.#strategy = n);
			}
		}
	}
}, Gzip = class extends Zlib {
	#portable;
	constructor(e) {
		super(e, `Gzip`), this.#portable = e && !!e.portable;
	}
	[_superWrite](e) {
		return this.#portable ? (this.#portable = !1, e[9] = 255, super[_superWrite](e)) : super[_superWrite](e);
	}
}, Unzip = class extends Zlib {
	constructor(e) {
		super(e, `Unzip`);
	}
}, Brotli = class extends ZlibBase {
	constructor(e, t) {
		e ||= {}, e.flush = e.flush || constants.BROTLI_OPERATION_PROCESS, e.finishFlush = e.finishFlush || constants.BROTLI_OPERATION_FINISH, e.fullFlushFlag = constants.BROTLI_OPERATION_FLUSH, super(e, t);
	}
}, BrotliCompress = class extends Brotli {
	constructor(e) {
		super(e, `BrotliCompress`);
	}
}, BrotliDecompress = class extends Brotli {
	constructor(e) {
		super(e, `BrotliDecompress`);
	}
}, Zstd = class extends ZlibBase {
	constructor(e, t) {
		e ||= {}, e.flush = e.flush || constants.ZSTD_e_continue, e.finishFlush = e.finishFlush || constants.ZSTD_e_end, e.fullFlushFlag = constants.ZSTD_e_flush, super(e, t);
	}
}, ZstdCompress = class extends Zstd {
	constructor(e) {
		super(e, `ZstdCompress`);
	}
}, ZstdDecompress = class extends Zstd {
	constructor(e) {
		super(e, `ZstdDecompress`);
	}
};
export { ZstdCompress as a, Unzip as i, BrotliDecompress as n, ZstdDecompress as o, Gzip as r, BrotliCompress as t };
