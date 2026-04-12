//#region src/filename.ts
const RE_JS = /\.([cm]?)jsx?$/;
const RE_TS = /\.([cm]?)tsx?$/;
const RE_DTS = /\.d\.([cm]?)ts$/;
const RE_DTS_MAP = /\.d\.([cm]?)ts\.map$/;
const RE_NODE_MODULES = /[\\/]node_modules[\\/]/;
const RE_CSS = /\.css$/;
const RE_VUE = /\.vue$/;
const RE_JSON = /\.json$/;
function filename_js_to_dts(id) {
	return id.replace(RE_JS, ".d.$1ts");
}
function filename_to_dts(id) {
	return id.replace(RE_VUE, ".vue.ts").replace(RE_TS, ".d.$1ts").replace(RE_JS, ".d.$1ts").replace(RE_JSON, ".d.ts");
}
function filename_dts_to(id, ext) {
	return id.replace(RE_DTS, `.$1${ext}`);
}
function resolveTemplateFn(fn, chunk) {
	return typeof fn === "function" ? fn(chunk) : fn;
}
function replaceTemplateName(template, name) {
	return template.replaceAll("[name]", name);
}

//#endregion
export { RE_CSS, RE_DTS, RE_DTS_MAP, RE_JS, RE_JSON, RE_NODE_MODULES, RE_TS, RE_VUE, filename_dts_to, filename_js_to_dts, filename_to_dts, replaceTemplateName, resolveTemplateFn };