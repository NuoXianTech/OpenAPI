import { s as ResolvedConfig, v as ReportPlugin, w as TsdownBundle, x as Logger } from "./index-BfO1W_C3.mjs";
import { Plugin } from "rolldown";

//#region src/features/external.d.ts
declare function ExternalPlugin({
  pkg,
  noExternal,
  inlineOnly,
  skipNodeModulesBundle
}: ResolvedConfig): Plugin;
//#endregion
//#region src/features/node-protocol.d.ts
/**
* The `node:` protocol was added in Node.js v14.18.0.
* @see https://nodejs.org/api/esm.html#node-imports
*/
declare function NodeProtocolPlugin(nodeProtocolOption: "strip" | true): Plugin;
//#endregion
//#region src/features/shebang.d.ts
declare function ShebangPlugin(logger: Logger, cwd: string, nameLabel?: string, isDualFormat?: boolean): Plugin;
//#endregion
//#region src/features/watch.d.ts
declare function WatchPlugin(configFiles: string[], {
  config,
  chunks
}: TsdownBundle): Plugin;
//#endregion
export { ExternalPlugin, NodeProtocolPlugin, ReportPlugin, ShebangPlugin, WatchPlugin };