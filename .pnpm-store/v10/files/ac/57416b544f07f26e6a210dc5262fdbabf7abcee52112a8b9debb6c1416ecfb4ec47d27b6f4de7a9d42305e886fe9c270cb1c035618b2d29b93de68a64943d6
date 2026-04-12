export async function createFetchForH3V1() {
  const [{ createApp, toNodeListener }, { fetchNodeRequestHandler }] = await Promise.all([
    import("h3"),
    import("node-mock-http")
  ]);
  const h3App = createApp();
  const nodeHandler = toNodeListener(h3App);
  const registry = /* @__PURE__ */ new Set();
  const _fetch = fetch;
  const h3Fetch = (async (input, _init) => {
    let url;
    let init = _init;
    if (typeof input === "string") {
      url = input;
    } else if (input instanceof URL) {
      url = input.toString();
    } else {
      url = input.url;
      init = {
        method: init?.method ?? input.method,
        body: init?.body ?? input.body,
        headers: init?.headers ?? input.headers
      };
    }
    const base = url.split("?")[0];
    if (registry.has(base) || registry.has(url)) {
      url = "/_" + url;
    }
    if (url.startsWith("/")) {
      const response = await fetchNodeRequestHandler(nodeHandler, url, init);
      return normalizeFetchResponse(response);
    }
    return _fetch(input, _init);
  });
  return {
    h3App,
    registry,
    fetch: h3Fetch
  };
}
function normalizeFetchResponse(response) {
  if (!response.headers.has("set-cookie")) {
    return response;
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: normalizeCookieHeaders(response.headers)
  });
}
function normalizeCookieHeader(header = "") {
  return splitCookiesString(joinHeaders(header));
}
function normalizeCookieHeaders(headers) {
  const outgoingHeaders = new Headers();
  for (const [name, header] of headers) {
    if (name === "set-cookie") {
      for (const cookie of normalizeCookieHeader(header)) {
        outgoingHeaders.append("set-cookie", cookie);
      }
    } else {
      outgoingHeaders.set(name, joinHeaders(header));
    }
  }
  return outgoingHeaders;
}
function joinHeaders(value) {
  return Array.isArray(value) ? value.join(", ") : String(value);
}
