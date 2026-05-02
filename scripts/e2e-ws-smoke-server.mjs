#!/usr/bin/env node
/**
 * Minimal HTTP + WebSocket server for Playwright E2E (`e2e/smoke.spec.ts`).
 * Serves `client/public` and implements `/ws` guest login → `welcome` with stats shape.
 * The full game server is optional for this smoke; use when `dist/` / deps are incomplete.
 */
import fs from "node:fs";
import path from "node:path";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { WebSocketServer } from "ws";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PUBLIC = path.join(ROOT, "client", "public");
const PORT = Number(process.env.PORT || 3000);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

function sendStatic(req, res) {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);
  let p = url.pathname;
  if (p === "/") p = "/index.html";
  const file = path.join(PUBLIC, path.normalize(p).replace(/^(\.\.(\/|\\|$))+/, ""));
  if (!file.startsWith(PUBLIC) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }
  const ext = path.extname(file);
  res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
}

const httpServer = createServer((req, res) => {
  if (req.url?.startsWith("/health")) {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }
  sendStatic(req, res);
});

const wss = new WebSocketServer({ noServer: true });

httpServer.on("upgrade", (request, socket, head) => {
  const host = request.headers.host || `127.0.0.1:${PORT}`;
  const pathname = new URL(request.url || "/", `http://${host}`).pathname;
  if (pathname !== "/ws") {
    socket.destroy();
    return;
  }
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit("connection", ws, request);
  });
});

wss.on("connection", (ws) => {
  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(String(raw));
    } catch {
      return;
    }
    if (msg?.type === "login") {
      const welcome = {
        type: "welcome",
        sceneId: "didis_hub",
        stats: {
          gold: 0,
          level: 1,
          health: 100,
          maxHealth: 100,
          mana: 50,
          maxMana: 50,
          skillCooldownUntil: {},
        },
      };
      ws.send(JSON.stringify(welcome));
    }
  });
});

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`[e2e-ws-smoke] listening on :${PORT} public=${PUBLIC}`);
});
