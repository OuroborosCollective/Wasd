import express from "express";
import { createServer } from "node:http";
import fs from "node:fs";
import { GameWebSocketServer } from "../networking/WebSocketServer.js";
import { WorldTick } from "./WorldTick.js";
import path from "path";
import { mcpRoute } from "../api/mcpRoute.js";
import migrationRoute from "../api/migrationRoute.js";
import { resolveClientPaths } from "./clientPaths.js";

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

    const { root: clientRoot, dist: clientDist } = resolveClientPaths();
    if (!fs.existsSync(path.join(clientDist, "index.html"))) {
      console.warn(
        `Client build missing at ${clientDist} (no index.html). Set CLIENT_DIST_PATH or run from the monorepo root.`
      );
    }
    if (process.env.NODE_ENV !== "production") {
      try {
        const { createServer: createViteServer } = await import("vite");
        const vite = await createViteServer({
          server: { middlewareMode: true },
          appType: "spa",
          root: clientRoot,
        });
        app.use(vite.middlewares);
      } catch (e) {
        console.error("Failed to start Vite middleware", e);
        app.use(express.static(clientDist));
      }
    } else {
      app.use(express.static(clientDist));
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
