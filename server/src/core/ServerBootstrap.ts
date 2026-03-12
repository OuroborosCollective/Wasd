import express from "express";
import { createServer } from "node:http";
import { GameWebSocketServer } from "../networking/WebSocketServer.js";
import { WorldTick } from "./WorldTick.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * ServerBootstrap — application entry-point and server composition root.
 *
 * Responsible for wiring together all top-level server components:
 * - An Express HTTP application with a `/health` endpoint.
 * - Vite dev-server middleware (development) or static file serving (production).
 * - The {@link GameWebSocketServer} that handles real-time client connections.
 * - The {@link WorldTick} game loop that drives all game simulation.
 *
 * Call {@link start} once at program startup.  The method is `async` to allow
 * optional dynamic import of Vite's development server without requiring it
 * as a production dependency.
 *
 * Environment variables:
 * - `NODE_ENV` — when set to `"production"` the server serves pre-built
 *               static files from `client/dist/` instead of starting Vite.
 * - `PORT`     — the TCP port to listen on; defaults to `3000`.
 *
 * @example
 * // server/src/index.ts
 * import { ServerBootstrap } from "./core/ServerBootstrap.js";
 * new ServerBootstrap().start();
 */
export class ServerBootstrap {
  /**
   * Starts the HTTP server, attaches the WebSocket server, and kicks off the
   * world tick loop.
   *
   * Steps performed:
   * 1. Creates an Express app and wraps it in a Node.js `http.Server`.
   * 2. Registers a `GET /health` endpoint that returns basic server info.
   * 3. In development: dynamically imports Vite and mounts it as middleware
   *    so that the client is hot-reloaded from `client/`.
   *    In production: serves the pre-built bundle from `client/dist/`.
   * 4. Instantiates and starts `GameWebSocketServer` on the same HTTP server.
   * 5. Instantiates `WorldTick` (which loads persisted data and spawns NPCs)
   *    and starts the 10 Hz game loop once the HTTP server is listening.
   */
  async start() {
    const app = express();
    const httpServer = createServer(app);

    app.get("/health", (_req, res) => {
      res.json({
        ok: true,
        project: "ARELORIAN MMORPG",
        version: "0.2.0"
      });
    });

    // Serve client with Vite in development, or static files in production
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
      }
    } else {
      app.use(express.static(path.resolve(__dirname, "../../../client/dist")));
    }

    const ws = new GameWebSocketServer(httpServer);
    ws.start();

    const tick = new WorldTick(ws);
    const port = Number(process.env.PORT || 3000);

    httpServer.listen(port, () => {
      console.log(`Arelorian server listening on ${port}`);
      tick.start();
    });
  }
}
