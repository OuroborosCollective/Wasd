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
import { getContentDataSourceLabel } from "../modules/content/contentDataRoot.js";
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

function envTruthy(key: string): boolean {
  const value = process.env[key]?.trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes";
}

function trimEnv(key: string): string {
  const value = process.env[key];
  return typeof value === "string" ? value.trim() : "";
}

/** Public anon config for the browser bundle (no service role). */
export function buildClientPublicConfigJson(): string {
  // When the server uses an internal proxy URL, the browser client should talk
  // to the game server origin — NOT directly to a self-signed Supabase endpoint.
  const proxyUrl = trimEnv("SUPABASE_PROXY_URL");
  const gameOrigin = trimEnv("GAME_ORIGIN") || trimEnv("APP_ORIGIN");
  let url: string;
  if (proxyUrl && gameOrigin) {
    url = gameOrigin;
  } else {
    url =
      trimEnv("VITE_SUPABASE_URL") ||
      trimEnv("VITE_SUPABASE_PUBLIC_URL") ||
      trimEnv("SUPABASE_PUBLIC_URL") ||
      trimEnv("SUPABASE_URL") ||
      trimEnv("API_EXTERNAL_URL");
  }
  const anonKey = trimEnv("VITE_SUPABASE_ANON_KEY") || trimEnv("SUPABASE_ANON_KEY") || trimEnv("ANON_KEY");
  return JSON.stringify({
    supabaseUrl: url || null,
    supabaseAnonKey: anonKey || null,
  });
}

function normalizeSupabaseBaseUrl(raw: string): string | null {
  try {
    const parsed = new URL(raw.trim());
    const cleanPath = parsed.pathname
      .replace(/\/+$/, "")
      .replace(/\/auth\/v1$/i, "")
      .replace(/\/+$/, "");
    return `${parsed.origin}${cleanPath}`;
  } catch {
    return null;
  }
}

/** Exported for tests — Kong / GoTrue base URL (no trailing /auth/v1). */
export function resolveSupabaseProxyBaseUrl(): string | null {
  const configured =
    trimEnv("SUPABASE_PROXY_URL") ||
    trimEnv("SUPABASE_URL") ||
    trimEnv("SUPABASE_PUBLIC_URL") ||
    trimEnv("API_EXTERNAL_URL") ||
    trimEnv("VITE_SUPABASE_URL") ||
    trimEnv("VITE_SUPABASE_PUBLIC_URL");
  if (!configured) return null;
  return normalizeSupabaseBaseUrl(configured);
}

function supabaseOriginFromRef(ref: string): string | null {
  const clean = ref.trim().toLowerCase();
  if (!/^[a-z0-9]{8,32}$/.test(clean)) return null;
  return `https://${clean}.supabase.co`;
}

function inferSupabaseProxyBaseFromApiKey(rawApiKey: string): string | null {
  const apiKey = rawApiKey.trim();
  if (!apiKey) return null;
  /** Never trust JWT payload for upstream URL without verifying (forged iss → SSRF). */
  let payload: Record<string, unknown>;
  try {
    payload = verifySupabaseToken(apiKey) as Record<string, unknown>;
  } catch {
    return null;
  }

  const refValue = payload.ref;
  if (typeof refValue === "string") {
    const fromRef = supabaseOriginFromRef(refValue);
    if (fromRef) return fromRef;
  }

  const issuerValue = payload.iss;
  if (typeof issuerValue === "string") {
    const normalized = normalizeSupabaseBaseUrl(issuerValue);
    if (normalized) {
      if (/^https:\/\/[a-z0-9-]+\.supabase\.co(?:$|\/)/i.test(normalized)) {
        return normalized;
      }
      /** Self-hosted GoTrue: iss is typically …/auth/v1 */
      if (/\/auth\/v1(?:\/|$)/i.test(issuerValue)) {
        return normalized;
      }
    }
  }

  return null;
}

function resolveRequestApiKey(req: Request): string {
  const fromApiKeyHeader = req.headers["apikey"];
  if (typeof fromApiKeyHeader === "string" && fromApiKeyHeader.trim()) {
    return fromApiKeyHeader.trim();
  }
  if (Array.isArray(fromApiKeyHeader) && fromApiKeyHeader.length > 0) {
    const first = fromApiKeyHeader.find((v) => typeof v === "string" && v.trim().length > 0);
    if (first) return first.trim();
  }
  const authHeader = req.headers.authorization;
  if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }
  return "";
}

export function resolveSupabaseProxyBaseUrlForRequest(
  req: Request,
  configuredBaseUrl: string | null
): string | null {
  if (configuredBaseUrl) return configuredBaseUrl;
  const apiKey = resolveRequestApiKey(req);
  if (!apiKey) return null;
  return inferSupabaseProxyBaseFromApiKey(apiKey);
}

function shouldProxyBody(method: string): boolean {
  const upper = method.toUpperCase();
  return upper !== "GET" && upper !== "HEAD";
}

export class ServerBootstrap {
  async start() {
    const app = express();
    const httpServer = createServer(app);
    const selfHealingRuntime = bootstrapSelfHealing(resolveSelfHealingConfigFromEnv());
    const supabaseProxyBaseUrl = resolveSupabaseProxyBaseUrl();

    app.use("/api/mcp", mcpRoute());
    app.use("/api/leaderboard", leaderboardRouter());
    app.use("/api/questlines", questlineRouter());
    app.use("/api/lore", loreRouter());

    app.get("/client-config.json", (_req, res) => {
      res.type("application/json");
      res.setHeader("Cache-Control", "no-store");
      res.send(buildClientPublicConfigJson());
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
        // GoTrue requires grant_type in the query string, but @supabase/supabase-js
        // sends it in the JSON body. Transform the URL if needed.
        let upstreamPath = req.originalUrl;
        if (req.method === "POST" && req.originalUrl.includes("/token") && !req.originalUrl.includes("grant_type=")) {
          try {
            const chunks: Buffer[] = [];
            const body = await new Promise<string>((resolve) => {
              req.on("data", (c: Buffer) => chunks.push(c));
              req.on("end", () => resolve(Buffer.concat(chunks).toString()));
            });
            const parsed = JSON.parse(body);
            if (parsed.grant_type) {
              const sep = upstreamPath.includes("?") ? "&" : "?";
              upstreamPath = `${upstreamPath}${sep}grant_type=${encodeURIComponent(parsed.grant_type)}`;
              delete parsed.grant_type;
              // Replace the request body without grant_type
              (req as unknown as { _transformedBody?: string })._transformedBody = JSON.stringify(parsed);
            }
          } catch {
            // Body parsing failed — forward as-is
          }
        }

        const upstreamUrl = new URL(
          upstreamPath,
          `${resolvedProxyBaseUrl.replace(/\/+$/, "")}/`
        ).toString();
        const headers = new Headers();
        for (const [key, value] of Object.entries(req.headers)) {
          if (!value) continue;
          const lower = key.toLowerCase();
          if (lower === "host" || lower === "content-length" || lower === "connection") continue;
          if (Array.isArray(value)) {
            headers.set(key, value.join(", "));
          } else {
            headers.set(key, value);
          }
        }
        if (!headers.has("x-forwarded-host") && req.headers.host) {
          headers.set("x-forwarded-host", String(req.headers.host));
        }
        if (!headers.has("x-forwarded-proto")) {
          const proto = req.headers["x-forwarded-proto"];
          headers.set("x-forwarded-proto", proto ? String(proto) : req.protocol);
        }

        const init: RequestInit & { duplex?: "half" } = {
          method: req.method,
          headers,
          redirect: "manual",
        };
        if (shouldProxyBody(req.method)) {
          const transformedBody = (req as unknown as { _transformedBody?: string })._transformedBody;
          init.body = transformedBody ?? (req as unknown as BodyInit);
          init.duplex = "half";
        }

        const upstreamResponse = await fetch(upstreamUrl, init);
        res.status(upstreamResponse.status);
        upstreamResponse.headers.forEach((value, key) => {
          const lower = key.toLowerCase();
          if (lower === "content-length" || lower === "content-encoding") return;
          res.setHeader(key, value);
        });
        const body = Buffer.from(await upstreamResponse.arrayBuffer());
        return res.send(body);
      } catch (error) {
        console.error("[ServerBootstrap] Supabase auth proxy failed:", error);
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
      // Add WASM MIME type middleware for production
      app.use((req, res, next) => {
        if (req.url?.endsWith(".wasm")) {
          res.setHeader("Content-Type", "application/wasm");
          // Required headers for WASM streaming
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
      });
    });
    app.use(selfHealingMiddleware());

    const port = Number(process.env.PORT || 3000);

    httpServer.listen(port, () => {
      console.log(`Arelorian server listening on ${port}`);
      tick.start();

      // Graceful shutdown: flush LiveHeal learning data
      const shutdownHandler = () => {
        console.log("[LiveHeal] Flushing data on shutdown...");
        tick.liveHeal.flush();
        tick.assetHealthService.flush();
        process.exit(0);
      };
      process.on("SIGTERM", shutdownHandler);
      process.on("SIGINT", shutdownHandler);
    });
  }
}
