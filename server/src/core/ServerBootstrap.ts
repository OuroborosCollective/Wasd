import express, { type Request } from "express";
import { createServer } from "node:http";
import { existsSync } from "node:fs";
import { GameWebSocketServer } from "../networking/WebSocketServer.js";
import { WorldTick } from "./WorldTick.js";
import path from "path";
import { fileURLToPath } from "url";
import { mcpRoute } from "../api/mcpRoute.js";
import migrationRoute from "../api/migrationRoute.js";
import { adminContentRouter } from "../api/adminContentRoute.js";
import { leaderboardRouter } from "../api/leaderboardRoute.js";
import { questlineRouter } from "../api/questlineRoute.js";
import { loreInteractRouter } from "../api/loreInteractRoute.js";
import { getContentDataSourceLabel } from "../modules/content/contentDataRoot.js";
import { getFirebaseAdminSummary } from "../config/firebase.js";
import { getSupabaseSummary } from "../config/supabase.js";
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

function resolveSupabaseProxyBaseUrl(): string | null {
  const configured =
    trimEnv("SUPABASE_URL") ||
    trimEnv("SUPABASE_PUBLIC_URL") ||
    trimEnv("VITE_SUPABASE_URL") ||
    trimEnv("VITE_SUPABASE_PUBLIC_URL");
  if (!configured) return null;
  return normalizeSupabaseBaseUrl(configured);
}

function decodeJwtSegment(segment: string): Record<string, unknown> | null {
  try {
    const normalized = segment.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const json = Buffer.from(padded, "base64").toString("utf8");
    const parsed = JSON.parse(json) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

function supabaseOriginFromRef(ref: string): string | null {
  const clean = ref.trim().toLowerCase();
  if (!/^[a-z0-9]{8,32}$/.test(clean)) return null;
  return `https://${clean}.supabase.co`;
}

function inferSupabaseProxyBaseFromApiKey(rawApiKey: string): string | null {
  const apiKey = rawApiKey.trim();
  if (!apiKey) return null;
  const segments = apiKey.split(".");
  if (segments.length < 2) return null;
  const payload = decodeJwtSegment(segments[1]);
  if (!payload) return null;

  const refValue = payload.ref;
  if (typeof refValue === "string") {
    const fromRef = supabaseOriginFromRef(refValue);
    if (fromRef) return fromRef;
  }

  const issuerValue = payload.iss;
  if (typeof issuerValue === "string") {
    const normalized = normalizeSupabaseBaseUrl(issuerValue);
    if (normalized && /^https:\/\/[a-z0-9-]+\.supabase\.co(?:$|\/)/i.test(normalized)) {
      return normalized;
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

    app.use("/api", migrationRoute);
    app.use("/api/mcp", mcpRoute());
    app.use("/api/leaderboard", leaderboardRouter());
    app.use("/api/questlines", questlineRouter());
    app.use("/api/lore", loreInteractRouter());

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
        const upstreamUrl = new URL(
          req.originalUrl,
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
          init.body = req as unknown as BodyInit;
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

    const ws = new GameWebSocketServer(httpServer);
    ws.start();

    const tick = new WorldTick(ws);
    await tick.init();
    app.use("/api/admin/content", adminContentRouter(tick));
    registerSelfHealingDashboard(
      app,
      selfHealingRuntime.system,
      resolveSelfHealingDashboardConfigFromEnv()
    );

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
        firebase: getFirebaseAdminSummary(),
        supabase: getSupabaseSummary(),
        auth: {
          useFirebaseWsLogin: envTruthy("USE_FIREBASE_WS_LOGIN"),
          useSupabaseWsLogin: envTruthy("USE_SUPABASE_WS_LOGIN"),
          requireFirebaseAuth: envTruthy("REQUIRE_FIREBASE_AUTH"),
          requireSupabaseAuth: envTruthy("REQUIRE_SUPABASE_AUTH"),
          allowGuestLogin: envTruthy("ALLOW_GUEST_LOGIN"),
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
      });
    });
    app.use(selfHealingMiddleware());

    const port = Number(process.env.PORT || 3000);

    httpServer.listen(port, () => {
      console.log(`Arelorian server listening on ${port}`);
      tick.start();
    });
  }
}
