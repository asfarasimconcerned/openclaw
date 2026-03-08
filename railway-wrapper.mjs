import http from "node:http";
import httpProxy from "http-proxy";

const PORT = Number(process.env.PORT || 8080);
const BROWSER_TARGET = "http://127.0.0.1:18791";
const GATEWAY_HTTP_TARGET = "http://127.0.0.1:18789";
const GATEWAY_WS_TARGET = "ws://127.0.0.1:18789";

const browserProxy = httpProxy.createProxyServer({
  target: BROWSER_TARGET,
  ws: false,
  changeOrigin: false,
});

const gatewayHttpProxy = httpProxy.createProxyServer({
  target: GATEWAY_HTTP_TARGET,
  ws: false,
  changeOrigin: false,
});

const gatewayWsProxy = httpProxy.createProxyServer({
  target: GATEWAY_WS_TARGET,
  ws: true,
  changeOrigin: false,
});

for (const proxy of [browserProxy, gatewayHttpProxy, gatewayWsProxy]) {
  proxy.on("error", (err, req, res) => {
    const msg = `Proxy error: ${err?.message || String(err)}`;
    if (res && !res.headersSent) {
      res.writeHead(502, { "Content-Type": "text/plain; charset=utf-8" });
      res.end(msg);
    }
  });
}

const server = http.createServer((req, res) => {
  const url = req.url || "/";

  if (url.startsWith("/__openclaw__/canvas/")) {
    gatewayHttpProxy.web(req, res);
    return;
  }

  browserProxy.web(req, res);
});

server.on("upgrade", (req, socket, head) => {
  gatewayWsProxy.ws(req, socket, head);
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[railway-wrapper] listening on 0.0.0.0:${PORT}`);
  console.log(`[railway-wrapper] browser -> ${BROWSER_TARGET}`);
  console.log(`[railway-wrapper] gateway ws/http -> ${GATEWAY_WS_TARGET}`);
});
