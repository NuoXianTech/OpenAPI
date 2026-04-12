const require_application = require('./application-DoV24cSv.cjs');
const require_audio = require('./audio-DSRayEk-.cjs');
const require_image = require('./image-B2vySihy.cjs');
const require_text = require('./text-C9hiVsx9.cjs');
const require_video = require('./video-9SGVm3s5.cjs');

//#region src/misc.ts
/**
* Random types not worthy of their own file
*/
const misc = {
	"chemical/x-cdx": {
		source: "apache",
		extensions: ["cdx"]
	},
	"chemical/x-cif": {
		source: "apache",
		extensions: ["cif"]
	},
	"chemical/x-cmdf": {
		source: "apache",
		extensions: ["cmdf"]
	},
	"chemical/x-cml": {
		source: "apache",
		extensions: ["cml"]
	},
	"chemical/x-csml": {
		source: "apache",
		extensions: ["csml"]
	},
	"chemical/x-xyz": {
		source: "apache",
		extensions: ["xyz"]
	},
	"font/collection": {
		source: "iana",
		extensions: ["ttc"]
	},
	"font/otf": {
		source: "iana",
		extensions: ["otf"]
	},
	"font/ttf": {
		source: "iana",
		extensions: ["ttf"]
	},
	"font/woff": {
		source: "iana",
		extensions: ["woff"]
	},
	"font/woff2": {
		source: "iana",
		extensions: ["woff2"]
	},
	"message/disposition-notification": {
		source: "iana",
		extensions: ["disposition-notification"]
	},
	"message/global": {
		source: "iana",
		extensions: ["u8msg"]
	},
	"message/global-delivery-status": {
		source: "iana",
		extensions: ["u8dsn"]
	},
	"message/global-disposition-notification": {
		source: "iana",
		extensions: ["u8mdn"]
	},
	"message/global-headers": {
		source: "iana",
		extensions: ["u8hdr"]
	},
	"message/rfc822": {
		source: "iana",
		extensions: ["eml", "mime"]
	},
	"message/vnd.wfa.wsc": {
		source: "iana",
		extensions: ["wsc"]
	},
	"model/3mf": {
		source: "iana",
		extensions: ["3mf"]
	},
	"model/gltf+json": {
		source: "iana",
		extensions: ["gltf"]
	},
	"model/gltf-binary": {
		source: "iana",
		extensions: ["glb"]
	},
	"model/iges": {
		source: "iana",
		extensions: ["igs", "iges"]
	},
	"model/mesh": {
		source: "iana",
		extensions: [
			"msh",
			"mesh",
			"silo"
		]
	},
	"model/mtl": {
		source: "iana",
		extensions: ["mtl"]
	},
	"model/obj": {
		source: "iana",
		extensions: ["obj"]
	},
	"model/step": {
		source: "iana",
		extensions: [
			".p21",
			".stp",
			".step",
			".stpnc",
			".210"
		]
	},
	"model/step+xml": {
		source: "iana",
		extensions: ["stpx"]
	},
	"model/step+zip": {
		source: "iana",
		extensions: ["stpz"]
	},
	"model/step-xml+zip": {
		source: "iana",
		extensions: ["stpxz"]
	},
	"model/stl": {
		source: "iana",
		extensions: ["stl"]
	},
	"model/vnd.collada+xml": {
		source: "iana",
		extensions: ["dae"]
	},
	"model/vnd.dwf": {
		source: "iana",
		extensions: ["dwf"]
	},
	"model/vnd.gdl": {
		source: "iana",
		extensions: ["gdl"]
	},
	"model/vnd.gtw": {
		source: "iana",
		extensions: ["gtw"]
	},
	"model/vnd.mts": {
		source: "iana",
		extensions: ["mts"]
	},
	"model/vnd.opengex": {
		source: "iana",
		extensions: ["ogex"]
	},
	"model/vnd.parasolid.transmit.binary": {
		source: "iana",
		extensions: ["x_b"]
	},
	"model/vnd.parasolid.transmit.text": {
		source: "iana",
		extensions: ["x_t"]
	},
	"model/vnd.sap.vds": {
		source: "iana",
		extensions: ["vds"]
	},
	"model/vnd.usdz+zip": {
		source: "iana",
		extensions: ["usdz"]
	},
	"model/vnd.valve.source.compiled-map": {
		source: "iana",
		extensions: ["bsp"]
	},
	"model/vnd.vtu": {
		source: "iana",
		extensions: ["vtu"]
	},
	"model/vrml": {
		source: "iana",
		extensions: ["wrl", "vrml"]
	},
	"model/x3d+binary": {
		source: "apache",
		extensions: ["x3db", "x3dbz"]
	},
	"model/x3d+fastinfoset": {
		source: "iana",
		extensions: ["x3db"]
	},
	"model/x3d+vrml": {
		source: "apache",
		extensions: ["x3dv", "x3dvz"]
	},
	"model/x3d+xml": {
		source: "iana",
		extensions: ["x3d", "x3dz"]
	},
	"model/x3d-vrml": {
		source: "iana",
		extensions: ["x3dv"]
	},
	"x-conference/x-cooltalk": {
		source: "apache",
		extensions: ["ice"]
	}
};

//#endregion
//#region src/index.ts
const mimes = {
	...require_application.application,
	...require_audio.audio,
	...require_image.image,
	...require_text.text,
	...require_video.video,
	...misc
};
const mimeTypes = mimes;
function extname(path) {
	const index = path.lastIndexOf(".");
	return index < 0 ? "" : path.substring(index);
}
const extensions = {};
const types = {};
function getTypes() {
	populateMaps(extensions, types);
	return types;
}
function getExtensions() {
	populateMaps(extensions, types);
	return extensions;
}
/**
* Lookup the MIME type for a file path/extension.
*/
function lookup(path) {
	if (!path || typeof path !== "string") return false;
	const extension = extname("x." + path).toLowerCase().substring(1);
	if (!extension) return false;
	return getTypes()[extension] || false;
}
let inittedMaps = false;
/**
* Populate the extensions and types maps.
* @private
*/
function populateMaps(extensions$1, types$1) {
	if (inittedMaps) return;
	inittedMaps = true;
	const preference = [
		"nginx",
		"apache",
		void 0,
		"iana"
	];
	Object.keys(mimeTypes).forEach((type) => {
		const mime = mimeTypes[type];
		const exts = mime.extensions;
		if (!exts.length) return;
		extensions$1[type] = exts;
		for (const extension of exts) {
			if (extension in types$1) {
				const from = preference.indexOf(mimeTypes[types$1[extension]].source);
				const to = preference.indexOf(mime.source);
				if (types$1[extension] !== "application/octet-stream" && (from > to || from === to && types$1[extension].startsWith("application/"))) continue;
			}
			types$1[extension] = type;
		}
	});
}

//#endregion
exports.getExtensions = getExtensions;
exports.getTypes = getTypes;
exports.lookup = lookup;
exports.mimeTypes = mimeTypes;