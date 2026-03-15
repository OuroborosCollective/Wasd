import express from "express";
import { createServer } from "node:http";
import { GameWebSocketServer } from "../networking/WebSocketServer.js";
import { WorldTick } from "./WorldTick.js";
import { db, DatabaseService } from "./Database.js";
import { runMigrations } from "./Migrations.js";
import { LandSystem } from "../modules/land/LandSystem.js";
import { createPayPalRouter } from "../api/paypalRoute.js";
import { createGLBUploadRouter } from "../api/glbUploadRoute.js";
import { createLandRouter } from "../api/landRoute.js";
import characterRouter from "../api/characterRoute.js";
import { characterAssembly } from "../modules/character/CharacterAssemblySystem.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ServerBootstrap {
  async start() {
    const app = express();
    const httpServer = createServer(app);

    // ── Middleware ─────────────────────────────────────────────────────────
    app.use(express.json({ limit: "10mb" }));
    app.use(express.urlencoded({ extended: true, limit: "10mb" }));

    // CORS Configuration
    app.use((req, res, next) => {
      const allowedOrigins = process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(',')
        : (process.env.NODE_ENV === 'production' ? [] : ['*']);

      const origin = req.headers.origin;
      if (allowedOrigins.includes('*')) {
        res.header("Access-Control-Allow-Origin", "*");
      } else if (origin && allowedOrigins.includes(origin)) {
        res.header("Access-Control-Allow-Origin", origin);
      }

      res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
      res.header("Access-Control-Allow-Headers", "Content-Type,Authorization,x-player-id");
      if (req.method === "OPTIONS") return res.sendStatus(200);
      next();
    });

    // ── Database & Systems ─────────────────────────────────────────────────
    const dbSvc = new DatabaseService();
    await dbSvc.connect();

    // Run DB migrations to ensure all tables exist
    await runMigrations();

    const landSystem = new LandSystem(dbSvc);
    await landSystem.init();

    // Init character assembly system
    characterAssembly.init();

    // ── Health ─────────────────────────────────────────────────────────────
    app.get("/health", (_req, res) => {
      res.json({
        ok: true,
        project: "ARELORIAN MMORPG",
        version: "0.4.0",
        features: ["paypal", "glb-upload", "land-system", "marketplace", "mobile", "modular-characters"],
      });
    });

    // Root health check for GCP Load Balancer
    app.get("/", (req, res, next) => {
      if (req.headers["user-agent"]?.includes("GoogleHC")) {
        return res.status(200).send("OK");
      }
      next();
    });

       // ── API Routes ─────────────────────────────────────────────────
    app.use("/api/paypal", createPayPalRouter());
    app.use("/api/glb", createGLBUploadRouter());
    app.use("/api/land", createLandRouter(landSystem));
    app.use("/api/character", characterRouter);

    // Matrix Energy balance endpoint
    app.get("/api/player/balance", async (req, res) => {
      const playerId = req.headers["x-player-id"] as string;
      if (!playerId) return res.status(401).json({ error: "Player ID required" });
      try {
        const result = await db.query(
          `SELECT matrix_energy, glb_enabled, glb_subscription_expires FROM players WHERE id=$1`,
          [playerId]
        );
        const p = result.rows[0];
        if (!p) return res.status(404).json({ error: "Player not found" });
        const glbActive = p.glb_enabled &&
          p.glb_subscription_expires &&
          new Date(p.glb_subscription_expires) > new Date();
        res.json({
          matrixEnergy: p.matrix_energy || 0,
          glbSubscriptionActive: !!glbActive,
          glbSubscriptionExpires: p.glb_subscription_expires || null,
        });
      } catch {
        res.json({ matrixEnergy: 0, glbSubscriptionActive: false });
      }
    });

    // ── Static uploads (GLB files) ─────────────────────────────────────────
    const uploadsDir = path.resolve(__dirname, "../../public/uploads");
    app.use("/uploads", express.static(uploadsDir));
    const modelsDir = path.resolve(__dirname, "../../public/models");
    app.use("/models", express.static(modelsDir));

    // ── Serve Client ───────────────────────────────────────────────────────
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
      const clientDist = path.resolve(__dirname, "../../../client/dist");
      app.use(express.static(clientDist));
      // SPA fallback
      app.get("*", (_req, res) => {
        res.sendFile(path.join(clientDist, "index.html"));
      });
    }

    // ── WebSocket & Game Loop ──────────────────────────────────────────────
    const ws = new GameWebSocketServer(httpServer);
    ws.start();

    const tick = new WorldTick(ws);
    await tick.init();

    const port = Number(process.env.PORT || 3000);
    httpServer.listen(port, () => {
      console.log(`Arelorian server v0.4.0 listening on ${port}`);
      console.log(`PayPal: ${process.env.PAYPAL_MODE || "sandbox"} mode`);
      tick.start();
    });
  }
}
