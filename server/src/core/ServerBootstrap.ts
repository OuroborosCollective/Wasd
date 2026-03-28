import express from "express";
import { createServer } from "node:http";
import { GameWebSocketServer } from "../networking/WebSocketServer.js";
import { WorldTick } from "./WorldTick.js";
import path from "path";
import { fileURLToPath } from "url";
import { mcpRoute } from "../api/mcpRoute.js";
import migrationRoute from "../api/migrationRoute.js";

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

    const clientPath = path.resolve(__dirname, "../../../client/dist");
    if (process.env.NODE_ENV !== "production") {
      try {
        const { createServer: createViteServer } = await import("vite");
        const vite = await createViteServer({
          server: { middlewareMode: true },
          appType: "spa",
          root: path.resolve(__dirname, "../../../client"),
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
