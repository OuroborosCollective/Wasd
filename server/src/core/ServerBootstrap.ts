import express from "express";
import { createServer } from "node:http";
import fs from "node:fs";
import { GameWebSocketServer } from "../networking/WebSocketServer.js";
import { WorldTick } from "./WorldTick.js";
import path from "path";
import { fileURLToPath } from "url";
import { mcpRoute } from "../api/mcpRoute.js";
import migrationRoute from "../api/migrationRoute.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Resolves client/dist and client root for Vite; avoids /opt/client/dist when only server/ is deployed under /opt. */
function resolveClientPaths(): { dist: string; root: string } {
  const env = process.env.CLIENT_DIST_PATH?.trim();
  if (env) {
    const dist = path.isAbsolute(env) ? env : path.resolve(process.cwd(), env);
    return { dist, root: path.dirname(dist) };
  }
  const fromBundle = path.resolve(__dirname, "../../../client/dist");
  const fromCwd = path.resolve(process.cwd(), "client/dist");
  const index = (d: string) => path.join(d, "index.html");
  let dist: string;
  if (fs.existsSync(index(fromBundle))) {
    dist = fromBundle;
  } else if (fs.existsSync(index(fromCwd))) {
    dist = fromCwd;
    console.warn(
      `[ServerBootstrap] Serving client from ${fromCwd} (cwd); bundle path had no index.html: ${fromBundle}. Set CLIENT_DIST_PATH to pin the path.`
    );
  } else {
    dist = fromBundle;
    console.warn(
      `[ServerBootstrap] No index.html under ${fromBundle} or ${fromCwd}. Static client may be missing; set CLIENT_DIST_PATH if the app lives elsewhere.`
    );
  }
  return { dist, root: path.dirname(dist) };
}

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

    const { dist: clientDistPath, root: clientRootPath } = resolveClientPaths();
    if (process.env.NODE_ENV !== "production") {
      try {
        const { createServer: createViteServer } = await import("vite");
        const vite = await createViteServer({
          server: { middlewareMode: true },
          appType: "spa",
          root: clientRootPath,
        });
        app.use(vite.middlewares);
      } catch (e) {
        console.error("Failed to start Vite middleware", e);
        app.use(express.static(clientDistPath));
      }
    } else {
      app.use(express.static(clientDistPath));
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
