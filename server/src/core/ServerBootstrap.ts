import { shutdownPostHog } from "../services/posthog.js";
import express, { type Request } from "express";
import { createServer } from "node:http";
import { existsSync } from "node:fs";
import { GameWebSocketServer } from "../networking/WebSocketServer.js";
import { WorldTick } from "./WorldTick.js";
import path from "path";
import { fileURLToPath } from "url";
import { mcpRoute } from "../api/mcpRoute.js";
import { adminContentRouter } from "../api/adminContentRoute.js";
import { voteRouter } from "../api/voteRoute.js";
import { leaderboardRouter } from "../api/leaderboardRoute.js";
import { questlineRouter } from "../api/questlineRoute.js";
import { loreRouter } from "../api/loreRoute.js";
import { getContentDataSourceLabel, resolveContentDir } from "../modules/content/contentDataRoot.js";
import { getSupabaseSummary, verifySupabaseToken } from "../config/supabase.js";
import { resolveWorldAssetsDir } from "./resolveWorldAssetsDir.js";
import { resolveMirroredWorldAssetsDir } from "./resolveMirroredWorldAssetsDir.js";
import {
  bootstrapSelfHealing,
  resolveSelfHealingConfigFromEnv,
  resolveSelfHealingDashboardConfigFromEnv,
  selfHealingMiddleware,
} from "../selfhealing/SelfHealingSystem.js";
import { registerSelfHealingDashboard } from "../selfhealing/SelfHealingDashboard.js";
import { PlaytesterConfig } from "../config/PlaytesterConfig.js";
import { PlaytesterMonitorStream } from "../modules/playtester/PlaytesterMonitorStream.js";
import { PlaytesterWebRTCSignaling } from "../modules/playtester/PlaytesterWebRTCSignaling.js";
import { initRedisClient } from "./RedisClient.js";
import { URL } from "node:url";

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

  let current = __dirname;
  for (let i = 0; i < 5; i++) {
    const check = path.join(current, "client");
    if (isClientDir(check)) return check;
    const sibling = path.join(path.dirname(current), "client");
    if (isClientDir(sibling)) return sibling;
    current = path.dirname(current);
  }
  return path.resolve(__dirname, "../../../client");
}

function resolveAdminContentHtmlPath(clientRoot: string, distPath: string): string | null {
  const paths = [
    path.join(distPath, "admin-content.html"),
    path.join(clientRoot, "public", "admin-content.html"),
    path.join(clientRoot, "admin-content.html"),
  ];
  for (const p of paths) {
    if (existsSync(p)) return p;
  }
  return null;
}

function resolvePlaytesterMonitorHtmlPath(clientRoot: string, distPath: string): string | null {
  const paths = [
    path.join(distPath, "playtester-monitor.html"),
    path.join(clientRoot, "public", "playtester-monitor.html"),
    path.join(clientRoot, "playtester-monitor.html"),
  ];
  for (const p of paths) {
    if (existsSync(p)) return p;
  }
  return null;
}

function resolvePlaytesterPublisherHtmlPath(clientRoot: string, distPath: string): string | null {
  const paths = [
    path.join(distPath, "playtester-render-publisher.html"),
    path.join(clientRoot, "public", "playtester-render-publisher.html"),
    path.join(clientRoot, "playtester-render-publisher.html"),
  ];
  for (const p of paths) {
    if (existsSync(p)) return p;
  }
  return null;
}

function resolveSupabaseProxyBaseUrl(): string | null {
  const raw =
    process.env.SUPABASE_PROXY_URL ||
    process.env.SUPABASE_URL ||
    process.env.SUPABASE_PUBLIC_URL ||
    "";
  if (!raw) return null;
  try {
    const u = new URL(raw);
    return u.origin;
  } catch {
    return null;
  }
}

function resolveSupabaseProxyBaseUrlForRequest(req: Request, defaultUrl: string | null): string | null {
  const apiKey = req.headers["apikey"] as string;
  if (!apiKey || apiKey.length < 20) return defaultUrl;
  const match = apiKey.match(/^[a-zA-Z0-9]{20,}/);
  if (!match) return defaultUrl;

  const ref = req.headers["x-supabase-ref"] as string;
  if (ref) {
    return `https://${ref}.supabase.co`;
  }
  return defaultUrl;
}

function buildClientPublicConfigJson(req: Request): string {
  const host = req.headers.host || "localhost:3000";
  const protocol = req.headers["x-forwarded-proto"] || "http";
  const origin = `${protocol}://${host}`;

  const supabaseUrl =
    process.env.SUPABASE_PROXY_URL ||
    process.env.GAME_ORIGIN ||
    process.env.SUPABASE_PUBLIC_URL ||
    origin;

  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";

  return JSON.stringify({
    supabaseUrl,
    supabaseAnonKey,
    websocketUrl: process.env.NEXT_PUBLIC_WEBSOCKET_URL || `ws://${host}/ws`,
    apiOrigin: process.env.API_EXTERNAL_URL || origin,
    posthogApiKey: process.env.NEXT_PUBLIC_POSTHOG_KEY || "",
    posthogHost: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
    environment: process.env.NODE_ENV || "development",
  });
}

function envTruthy(key: string): boolean {
  const v = process.env[key]?.trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

function shouldProxyBody(method: string): boolean {
  return ["POST", "PUT", "PATCH", "DELETE"].includes(method.toUpperCase());
}

function canAccessPlaytesterMonitor(req: Request): boolean {
  const token = PlaytesterConfig.monitorToken;
  if (!token) return true;
  const provided = req.query.token as string;
  return provided === token;
}

export class ServerBootstrap {
  async start() {
    const app = express();
    const httpServer = createServer(app);
    const selfHealingRuntime = bootstrapSelfHealing(resolveSelfHealingConfigFromEnv());
    const supabaseProxyBaseUrl = resolveSupabaseProxyBaseUrl();

    // Initialize Redis before anything else
    await initRedisClient();

    app.use("/api/mcp", mcpRoute());
    app.use("/api/leaderboard", leaderboardRouter());
    app.use("/api/questlines", questlineRouter());
    app.use("/api/lore", loreRouter());

    app.get("/client-config.json", (_req, res) => {
      res.type("application/json");
      res.setHeader("Cache-Control", "no-store");
      res.send(buildClientPublicConfigJson(_req));
    });

    app.get("/", (req, res, next) => {
      if (req.headers["user-agent"]?.includes("GoogleHC")) {
        return res.status(200).send("OK");
      }
      next();
    });

    app.use("/auth/v1", async (req, res) => {
      const resolvedProxyBaseUrl = resolveSupabaseProxyBaseUrlForRequest(req, supabaseProxyBaseUrl);
      if (!resolvedProxyBaseUrl) {
        return res.status(502).json({
          error: "supabase_auth_proxy_not_configured",
          message:
            "SUPABASE_URL/SUPABASE_PUBLIC_URL is missing and no valid Supabase apikey/ref was provided. Configure SUPABASE_URL or send the Supabase anon key so /auth/v1 can be resolved.",
        });
      }

      try {
        let bufferedBody: Buffer | undefined;
        if (shouldProxyBody(req.method)) {
          const chunks: Buffer[] = [];
          bufferedBody = await new Promise<Buffer>((resolve, reject) => {
            req.on("data", (c: Buffer) => chunks.push(c));
            req.on("end", () => resolve(Buffer.concat(chunks)));
            req.on("error", (err) => reject(err));
          });
        }

        // GoTrue requires grant_type in the query string, but @supabase/supabase-js
        // sends it in the JSON body. Transform the URL if needed.
        let upstreamPath = req.originalUrl;
        let transformedBody: string | undefined;
        if (
          req.method === "POST" &&
          req.originalUrl.includes("/token") &&
          !req.originalUrl.includes("grant_type=") &&
          bufferedBody
        ) {
          try {
            const bodyStr = bufferedBody.toString();
            const parsed = JSON.parse(bodyStr);
            if (parsed.grant_type) {
              const sep = upstreamPath.includes("?") ? "&" : "?";
              upstreamPath = `${upstreamPath}${sep}grant_type=${encodeURIComponent(parsed.grant_type)}`;
              delete parsed.grant_type;
              transformedBody = JSON.stringify(parsed);
            }
          } catch (e) {
            /* ignore parse fail */
          }
        }

        const headers = { ...req.headers };
        delete headers.host;
        delete headers["content-length"];

        const upstreamUrl = resolvedProxyBaseUrl + upstreamPath;
        const init: RequestInit = {
          method: req.method,
          headers: headers as any,
          redirect: "manual",
        };
        if (shouldProxyBody(req.method)) {
          init.body = (transformedBody ?? bufferedBody) as any;
          (init as any).duplex = "half";
        }

        const upstreamResponse = await fetch(upstreamUrl, init);
        res.status(upstreamResponse.status);
        upstreamResponse.headers.forEach((value, key) => {
          const lower = key.toLowerCase();
          if (lower === "content-length" || lower === "content-encoding") return;
          res.setHeader(key, value);
        });

        const respData = await upstreamResponse.arrayBuffer();
        res.send(Buffer.from(respData));
      } catch (err) {
        console.error("[AuthProxy] Failed to forward request to Supabase:", err);
        return res.status(502).json({
          error: "supabase_auth_proxy_upstream_failed",
          message: "Network problem while contacting Supabase. Please check your connection and server URL.",
        });
      }
    });

    const ws = new GameWebSocketServer(httpServer);
    ws.start();

    const tick = new WorldTick(ws);
    await tick.init();
    const monitorStream = new PlaytesterMonitorStream(httpServer, (options) =>
      tick.buildPlaytesterMonitorPayload(options)
    );
    monitorStream.start();
    const playtesterSignaling = new PlaytesterWebRTCSignaling(httpServer);
    playtesterSignaling.start();
    const monitorClientRoot = resolveClientRoot();
    const monitorHtmlPath = resolvePlaytesterMonitorHtmlPath(
      monitorClientRoot,
      path.join(monitorClientRoot, "dist"),
    );
    const publisherHtmlPath = resolvePlaytesterPublisherHtmlPath(
      monitorClientRoot,
      path.join(monitorClientRoot, "dist"),
    );
    if (monitorHtmlPath) {
      app.get("/playtester-monitor.html", (req, res) => {
        if (!canAccessPlaytesterMonitor(req)) {
          res.status(403).json({ error: "forbidden" });
          return;
        }
        res.sendFile(monitorHtmlPath);
      });
    }
    if (publisherHtmlPath) {
      app.get("/playtester-render-publisher.html", (req, res) => {
        if (!canAccessPlaytesterMonitor(req)) {
          res.status(403).json({ error: "forbidden" });
          return;
        }
        res.sendFile(publisherHtmlPath);
      });
    }
    app.get("/api/playtester/debug-log", (req, res) => {
      if (!canAccessPlaytesterMonitor(req)) {
        res.status(403).json({ error: "forbidden" });
        return;
      }
      const logPath = tick.getPlaytesterDebugLogPath();
      res.json({
        ok: Boolean(logPath),
        enabled: PlaytesterConfig.enabled,
        streamEnabled: PlaytesterConfig.streamEnabled,
        monitorMode: PlaytesterConfig.monitorMode,
        monitorPath: PlaytesterConfig.monitorPath,
        monitorSignalPath: PlaytesterConfig.monitorSignalPath,
        monitorPublisherPath: PlaytesterConfig.monitorPublisherPath,
        monitorTokenRequired: PlaytesterConfig.monitorToken.length > 0,
        stream: {
          width: PlaytesterConfig.streamWidth,
          height: PlaytesterConfig.streamHeight,
          fps: PlaytesterConfig.streamFps,
          quality: PlaytesterConfig.streamQuality,
          shadows: PlaytesterConfig.streamShadows,
          particles: PlaytesterConfig.streamParticles,
          renderDistance: PlaytesterConfig.streamRenderDistance,
          iceServers: PlaytesterConfig.streamIceServers,
        },
        debugLogPath: logPath,
      });
    });
    app.use("/api/admin/content", adminContentRouter(tick));
    app.use("/api/vote", voteRouter(tick));
    registerSelfHealingDashboard(
      app,
      selfHealingRuntime.system,
      resolveSelfHealingDashboardConfigFromEnv()
    );

    const clientRoot = resolveClientRoot();
    const clientPath = path.join(clientRoot, "dist");
    const itchClientPath = path.join(clientRoot, "dist-itch");
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
    if (existsSync(path.join(itchClientPath, "index.html"))) {
      app.use(
        "/itch",
        express.static(itchClientPath, {
          index: "index.html",
        }),
      );
      app.get("/itch/*", (_req, res) => {
        res.sendFile(path.join(itchClientPath, "index.html"));
      });
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
      app.use((req, res, next) => {
        if (req.url?.endsWith(".wasm")) {
          res.setHeader("Content-Type", "application/wasm");
          res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
          res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
        }
        next();
      });
      app.use(express.static(clientPath));
    }

    const mirroredWorld = resolveMirroredWorldAssetsDir();
    const worldAssetsDir = mirroredWorld ?? resolveWorldAssetsDir();
    if (worldAssetsDir) {
      app.use(
        "/world-assets",
        express.static(worldAssetsDir, {
          maxAge: process.env.NODE_ENV === "production" ? "7d" : 0,
          fallthrough: false,
        })
      );
      console.log(
        `[ServerBootstrap] Serving /world-assets from ${worldAssetsDir}` +
          (mirroredWorld ? " (client mirror: assets/models/world-assets)" : "")
      );
    } else {
      console.warn(
        "[ServerBootstrap] world-assets mirror and repo world-assets/ missing — /world-assets/* may 404. " +
          "Run client prebuild (sync-world-assets) or set WORLD_ASSETS_DIR."
      );
    }

    try {
      const worldDir = resolveContentDir("world");
      if (existsSync(worldDir)) {
        app.use(
          "/world",
          express.static(worldDir, {
            maxAge: process.env.NODE_ENV === "production" ? "1h" : 0,
            fallthrough: true,
          })
        );
        console.log(`[ServerBootstrap] Serving /world from ${worldDir}`);
      }
    } catch (e) {
      console.warn("[ServerBootstrap] Could not resolve game-data/world for /world route:", e);
    }

    app.get("/health", (_req, res) => {
      const persistence = tick.getPersistenceStats();
      const content = getContentDataSourceLabel();
      const selfHealingStatus = selfHealingRuntime.system.getStatus();
      res.json({
        ok: true,
        project: "ARELORIAN MMORPG",
        version: "0.2.0",
        persistence,
        content: { mode: content.mode, root: content.root },
        supabase: getSupabaseSummary(),
        auth: {
          useSupabaseWsLogin: envTruthy("USE_SUPABASE_WS_LOGIN"),
          requireSupabaseAuth: envTruthy("REQUIRE_SUPABASE_AUTH"),
          allowGuestLogin: (() => {
            const v = process.env.ALLOW_GUEST_LOGIN?.trim().toLowerCase();
            if (v === "0" || v === "false" || v === "no") return false;
            return true;
          })(),
          allowDevLogin: !["0", "false", "no"].includes(process.env.ALLOW_DEV_LOGIN?.trim().toLowerCase() || ""),
        },
        selfHealing: {
          active: selfHealingStatus.active,
          patchMode: selfHealingStatus.config.patchMode,
          totalErrors: selfHealingStatus.totalErrors,
          totalHealed: selfHealingStatus.totalHealed,
          healingRate: selfHealingStatus.healingRate,
          featuresProtected: selfHealingStatus.featuresProtected,
        },
        liveHeal: (() => {
          const status = tick.liveHeal.getStatus();
          return {
            tickCount: status.tickCount,
            subsystems: status.subsystems.map(s => ({
              id: s.id,
              state: s.state,
              score: s.score,
              healingLocked: s.healingLocked,
            })),
            learningEntries: status.learningEntries,
            logEntries: status.logEntries,
          };
        })(),
        assetHealth: (() => {
          const stats = tick.assetHealthService.getStats();
          return {
            totalScanned: stats.totalScanned,
            totalValid: stats.totalValid,
            totalWarnings: stats.totalWarnings,
            totalHardFailures: stats.totalHardFailures,
            totalQuarantined: stats.totalQuarantined,
            startupScanDone: stats.startupScanDone,
          };
        })(),
        playtester: {
          enabled: PlaytesterConfig.enabled,
          streamEnabled: PlaytesterConfig.streamEnabled,
          monitorMode: PlaytesterConfig.monitorMode,
          monitorPath: PlaytesterConfig.monitorPath,
          monitorSignalPath: PlaytesterConfig.monitorSignalPath,
          monitorPublisherPath: PlaytesterConfig.monitorPublisherPath,
          monitorTokenRequired: PlaytesterConfig.monitorToken.length > 0,
          debugLogPath: tick.getPlaytesterDebugLogPath(),
          stream: {
            width: PlaytesterConfig.streamWidth,
            height: PlaytesterConfig.streamHeight,
            fps: PlaytesterConfig.streamFps,
            quality: PlaytesterConfig.streamQuality,
            shadows: PlaytesterConfig.streamShadows,
            particles: PlaytesterConfig.streamParticles,
            renderDistance: PlaytesterConfig.streamRenderDistance,
            iceServers: PlaytesterConfig.streamIceServers,
          },
        },
      });
    });
    app.use(selfHealingMiddleware());

    const port = Number(process.env.PORT || 3000);

    httpServer.listen(port, () => {
      console.log(`Arelorian server listening on ${port}`);
      tick.start();

      const shutdownHandler = async () => {
        console.log("[Shutdown] Flushing data...");
        playtesterSignaling.stop();
        monitorStream.stop();
        tick.liveHeal.flush();
        tick.assetHealthService.flush();
        try {
          await shutdownPostHog();
        } catch (e) {
          console.warn("[Shutdown] PostHog shutdown failed", e);
        }
        process.exit(0);
      };
      process.on("SIGTERM", shutdownHandler);
      process.on("SIGINT", shutdownHandler);
    });
  }
}
