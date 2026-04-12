function isMessage(message) {
  return message !== null && typeof message === "object" && "type" in message && message.type !== null && typeof message.type === "string" && "payload" in message && message.payload !== null && typeof message.payload === "object";
}
function createVitestTestSummary() {
  return {
    failedCount: 0,
    passedCount: 0,
    totalCount: 0
  };
}
function sendMessageToHost(type, payload) {
  process.send?.({ type, payload });
}
function listenHostMessages(listener) {
  process.on("message", (message) => {
    if (isMessage(message)) {
      listener(message);
    }
  });
}
function sendMessageToCli(cli, type, payload) {
  cli.send({ type, payload });
}
function listenCliMessages(cli, listener) {
  cli.on("message", (message) => {
    if (isMessage(message)) {
      listener(message);
    }
  });
}

export { listenHostMessages as a, sendMessageToHost as b, createVitestTestSummary as c, listenCliMessages as l, sendMessageToCli as s };
