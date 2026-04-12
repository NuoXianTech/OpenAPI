import { importModule } from 'local-pkg';
import { getPort } from 'get-port-please';
import { a as listenHostMessages, b as sendMessageToHost } from '../shared/test-utils.DDUpsMYL.mjs';

function createCustomReporter(onVitestInit) {
  let ctx = void 0;
  function getVitestUiUrl() {
    if (!ctx.config.ui) return void 0;
    const protocol = ctx.vite.config.server.https ? "https:" : "http:";
    const host = ctx.config.api.host || "localhost";
    const port = ctx.config.api.port;
    const uiBase = ctx.config.uiBase;
    return `${protocol}//${host}:${port}${uiBase}`;
  }
  function toUpdatedResult() {
    const files = ctx.state.getFiles();
    return {
      failedCount: files.filter((f) => f.result?.state === "fail").length ?? 0,
      passedCount: files.filter((f) => f.result?.state === "pass").length ?? 0,
      totalCount: files.length ?? 0
    };
  }
  function toFinishedResult() {
    return toUpdatedResult();
  }
  return {
    onInit(_ctx) {
      ctx = _ctx;
      onVitestInit(ctx);
      sendMessageToHost("started", { uiUrl: getVitestUiUrl() });
    },
    onTestRunStart() {
      sendMessageToHost("updated", toUpdatedResult());
    },
    onTestModuleCollected() {
      sendMessageToHost("updated", toUpdatedResult());
    },
    onTestCaseResult() {
      sendMessageToHost("updated", toUpdatedResult());
    },
    onTestModuleEnd() {
      sendMessageToHost("updated", toUpdatedResult());
    },
    onTestRunEnd() {
      sendMessageToHost("finished", toFinishedResult());
    }
  };
}
async function main() {
  const {
    apiPorts,
    watchMode
  } = await new Promise((resolve) => {
    listenHostMessages(({ type, payload }) => {
      if (type === "start") resolve(payload);
    });
  });
  const port = apiPorts ? await getPort({ ports: apiPorts }) : void 0;
  const { startVitest } = await importModule("vitest/node");
  const customReporter = createCustomReporter((vitest2) => {
    listenHostMessages(async ({ type, payload }) => {
      if (type === "stop") {
        await vitest2.exit(payload.force);
        process.exit();
      }
    });
  });
  const vitest = await startVitest("test", [], watchMode ? {
    passWithNoTests: true,
    ui: true,
    watch: true,
    open: false,
    api: { port }
  } : { ui: false, watch: false }, {
    test: {
      reporters: ["default", customReporter]
    }
  });
  if (!watchMode) {
    await vitest.exit();
    process.exit();
  }
}
main();
