import express from "express";
import { createServer } from "node:http";
import fs from "node:fs";
import { GameWebSocketServer } from "../networking/WebSocketServer.js";
import { WorldTick } from "./WorldTick.js";
import path from "path";
import { fileURLToPath } from "url";
import { mcpRoute } from "../api/mcpRoute.js";
import migrationRoute from "../api/migrationRoute.js";
import { resolveClientDistDir, resolveClientViteRoot } from "../utils/clientPaths.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ServerBootstrap {
  async start() {
    const app = express();
    const httpServer = createServer(app);

    app.use("/api", migrationRoute);
    app.use("/api/mcp", mcpRoute());

    app.get("/health", (_req, res) => {
      res.json({
        ok: true,
        project: "ARELORIAN MMORPG",
        version: "0.2.0"
      });
    });

    app.get("/", (req, res, next) => {
      if (req.headers["user-agent"]?.includes("GoogleHC")) {
        return res.status(200).send("OK");
      }
      next();
    });

    const clientPath = resolveClientDistDir(__dirname);
    const clientIndex = path.join(clientPath, "index.html");
    if (!fs.existsSync(clientIndex)) {
      console.warn(
        `[ServerBootstrap] No index.html at ${clientPath}. Set CLIENT_DIST_PATH or run the server with cwd at the monorepo root (or use a sibling ../client/dist).`
      );
    }

    if (process.env.NODE_ENV !== "production") {
      try {
        const { createServer: createViteServer } = await import("vite");
        const viteRoot = resolveClientViteRoot(__dirname, clientPath);
        const vite = await createViteServer({
          server: { middlewareMode: true },
          appType: "spa",
          root: viteRoot,
        });
        app.use(vite.middlewares);
      } catch (e) {
        console.error("Failed to start Vite middleware", e);
        app.use(express.static(clientPath));
      }
    } else {
      app.use(express.static(clientPath));
    }

    const ws = new GameWebSocketServer(httpServer);
    ws.start();

    const tick = new WorldTick(ws);
    await tick.init();
    const port = Number(process.env.PORT || 3000);

    httpServer.listen(port, () => {
      console.log(`Arelorian server listening on ${port}`);
      tick.start();
    });
  }
}
