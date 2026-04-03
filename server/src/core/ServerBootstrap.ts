import express from "express";
import { createServer } from "node:http";
import { existsSync } from "node:fs";
import { GameWebSocketServer } from "../networking/WebSocketServer.js";
import { WorldTick } from "./WorldTick.js";
import path from "path";
import { fileURLToPath } from "url";
import { mcpRoute } from "../api/mcpRoute.js";
import migrationRoute from "../api/migrationRoute.js";
import { adminContentRouter } from "../api/adminContentRoute.js";
import { getContentDataSourceLabel } from "../modules/content/contentDataRoot.js";
import { resolveWorldAssetsDir } from "./resolveWorldAssetsDir.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Resolves the Vite / static client package root.
 * When only `server/dist` is deployed under e.g. /opt/server, `__dirname/../../../client`
 * resolves to /opt/client. Prefer CLIENT_ROOT_DIR, cwd/client, or walking up from __dirname
 * until a `client` folder with package.json or built dist is found.
 */
function resolveClientRoot(): string {
  const fromEnv = process.env.CLIENT_ROOT_DIR?.trim();
  if (fromEnv) {
    return path.isAbsolute(fromEnv) ? fromEnv : path.resolve(process.cwd(), fromEnv);
  }

  const isClientDir = (dir: string) =>
    existsSync(path.join(dir, "package.json")) ||
    existsSync(path.join(dir, "dist", "index.html"));

  const fromCwd = path.resolve(process.cwd(), "client");
  if (isClientDir(fromCwd)) {
    return fromCwd;
  }

  let dir = __dirname;
  for (let i = 0; i < 10; i++) {
    const candidate = path.join(dir, "client");
    if (isClientDir(candidate)) {
      return candidate;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }

  return path.resolve(__dirname, "../../../client");
}

function resolveAdminContentHtmlPath(clientRoot: string, clientDist: string): string | null {
  const candidates = [
    path.join(clientDist, "admin-content.html"),
    path.join(clientRoot, "public", "admin-content.html"),
  ];
  for (const p of candidates) {
    if (existsSync(p)) {
      return path.resolve(p);
    }
  }
  return null;
}

export class ServerBootstrap {
  async start() {
    const app = express();
    const httpServer = createServer(app);

    app.use("/api", migrationRoute);
    app.use("/api/mcp", mcpRoute());

    app.get("/", (req, res, next) => {
      if (req.headers["user-agent"]?.includes("GoogleHC")) {
        return res.status(200).send("OK");
      }
      next();
    });

    const clientRoot = resolveClientRoot();
    const clientPath = path.join(clientRoot, "dist");
    const adminContentPath = resolveAdminContentHtmlPath(clientRoot, clientPath);
    if (adminContentPath) {
      app.get("/admin-content.html", (_req, res) => {
        res.sendFile(adminContentPath);
      });
    } else {
      console.warn(
        "[ServerBootstrap] admin-content.html not found under client/dist or client/public — run client build or copy the file."
      );
    }
    if (
      process.env.NODE_ENV === "production" &&
      !existsSync(path.join(clientPath, "index.html"))
    ) {
      console.warn(
        `[ServerBootstrap] No index.html under ${clientPath}. ` +
          "Build the client or set CLIENT_ROOT_DIR to the client package directory (e.g. /opt/areloria/client)."
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
        app.use(express.static(clientPath));
      }
    } else {
      app.use(express.static(clientPath));
    }

    const worldAssetsDir = resolveWorldAssetsDir();
    if (worldAssetsDir) {
      app.use(
        "/world-assets",
        express.static(worldAssetsDir, {
          maxAge: process.env.NODE_ENV === "production" ? "7d" : 0,
          fallthrough: false,
        })
      );
      console.log(`[ServerBootstrap] Serving /world-assets from ${worldAssetsDir}`);
    } else {
      console.warn(
        "[ServerBootstrap] world-assets/ not found — GLB paths under /world-assets/* will 404 unless WORLD_ASSETS_DIR is set."
      );
    }

    const ws = new GameWebSocketServer(httpServer);
    ws.start();

    const tick = new WorldTick(ws);
    await tick.init();
    app.use("/api/admin/content", adminContentRouter(tick));

    app.get("/health", (_req, res) => {
      const persistence = tick.getPersistenceStats();
      const content = getContentDataSourceLabel();
      res.json({
        ok: true,
        project: "ARELORIAN MMORPG",
        version: "0.2.0",
        persistence,
        content: { mode: content.mode, root: content.root },
      });
    });

    const port = Number(process.env.PORT || 3000);

    httpServer.listen(port, () => {
      console.log(`Arelorian server listening on ${port}`);
      tick.start();
    });
  }
}
