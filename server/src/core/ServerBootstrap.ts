import { shutdownPostHog } from "../services/posthog.js";
import express, { type Request } from "express";
import { createServer } from "node:http";
import { existsSync } from "node:fs";
import { GameWebSocketServer } from "../networking/WebSocketServer.js";
import { WorldTick } from "./WorldTick.js";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mcpRoute } from "../api/mcpRoute.js";
import { adminContentRouter } from "../api/adminContentRoute.js";
import { voteRouter } from "../api/voteRoute.js";
import { leaderboardRouter } from "../api/leaderboardRoute.js";
import { questlineRouter } from "../api/questlineRoute.js";
import { loreRouter } from "../api/loreRoute.js";
import { scienceMascotRouter } from "../api/scienceMascotRoute.js";
import { warfrontRouter } from "../api/warfrontRoute.js";
import { areValidationRouter } from "../api/areValidationRoute.js";
import { areReplayRouter } from "../api/areReplayRoute.js";
import { sovereignDeployRouter } from "../api/sovereignDeployRoute.js";
import { getContentDataSourceLabel, resolveContentDir } from "../modules/content/contentDataRoot.js";
import { getSupabaseSummary, verifySupabaseToken } from "../config/supabase.js";
import { resolveWorldAssetsDir } from "./resolveWorldAssetsDir.js";
import { resolveMirroredWorldAssetsDir } from "./resolveMirroredWorldAssetsDir.js";
import { registerSelfHealingDashboard } from "../selfhealing/SelfHealingDashboard.js";
import { PlaytesterConfig } from "../config/PlaytesterConfig.js";
import { PlaytesterMonitorStream } from "../modules/playtester/PlaytesterMonitorStream.js";
import { PlaytesterWebRTCSignaling } from "../modules/playtester/PlaytesterWebRTCSignaling.js";
import { initRedisClient } from "./RedisClient.js";
import { URL } from "node:url";

const currentDir = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

type HealthContentSummary = { mode: "published" | "pack_dir" | "legacy" | "unknown"; root: string | null };
type HealthSupabaseSummary = ReturnType<typeof getSupabaseSummary> | { status: "unknown" };

function resolveClientRoot(): string {
  const fromEnv = process.env.CLIENT_ROOT_DIR?.trim();
  if (fromEnv) return path.isAbsolute(fromEnv) ? fromEnv : path.resolve(process.cwd(), fromEnv);
  const isClientDir = (dir: string) => existsSync(path.join(dir, "package.json")) || existsSync(path.join(dir, "dist", "index.html"));
  const fromCwd = path.resolve(process.cwd(), "client");
  if (isClientDir(fromCwd)) return fromCwd;
  let current = currentDir;
  for (let i = 0; i < 5; i++) {
    const check = path.join(current, "client");
    if (isClientDir(check)) return check;
    const sibling = path.join(path.dirname(current), "client");
    if (isClientDir(sibling)) return sibling;
    current = path.dirname(current);
  }
  return path.resolve(currentDir, "..", "..", "..", "client");
}

function resolveAdminContentHtmlPath(clientRoot: string, distPath: string): string | null {
  for (const p of [path.join(distPath, "admin-content.html"), path.join(clientRoot, "public", "admin-content.html"), path.join(clientRoot, "admin-content.html")]) if (existsSync(p)) return p;
  return null;
}
function resolvePlaytesterMonitorHtmlPath(clientRoot: string, distPath: string): string | null {
  for (const p of [path.join(distPath, "playtester-monitor.html"), path.join(clientRoot, "public", "playtester-monitor.html"), path.join(clientRoot, "playtester-monitor.html")]) if (existsSync(p)) return p;
  return null;
}
function resolvePlaytesterPublisherHtmlPath(clientRoot: string, distPath: string): string | null {
  for (const p of [path.join(distPath, "playtester-render-publisher.html"), path.join(clientRoot, "public", "playtester-render-publisher.html"), path.join(clientRoot, "playtester-render-publisher.html")]) if (existsSync(p)) return p;
  return null;
}

export function resolveSupabaseProxyBaseUrl(): string | null {
  const raw = process.env.SUPABASE_PROXY_URL || process.env.SUPABASE_URL || process.env.SUPABASE_PUBLIC_URL || process.env.API_EXTERNAL_URL || "";
  if (!raw) return null;
  try { return new URL(raw).origin; } catch { return null; }
}

export function resolveSupabaseProxyBaseUrlForRequest(req: Request, defaultUrl: string | null): string | null {
  const rawAuthBlob = (req.headers["apikey"] as string) || (req.headers["authorization"]?.split(" ")[1] as string);
  if (!rawAuthBlob || rawAuthBlob.length < 20) return defaultUrl;
  const ref = req.headers["x-supabase-ref"] as string;
  if (ref && /^[a-z0-9]{8,32}$/i.test(ref)) return `https://${ref}.supabase.co`;
  try {
    const claims = verifySupabaseToken(rawAuthBlob);
    const claimRef = claims.ref;
    const claimIss = claims.iss;
    if (claimRef && /^[a-z0-9]{8,32}$/i.test(claimRef)) return `https://${claimRef}.supabase.co`;
    if (claimIss && (claimIss.startsWith("https://") || claimIss.startsWith("http://")) && claimIss.includes("/auth/v1")) {
      const parts = claimIss.split("/auth/v1");
      if (parts[0] && /^https?:\/\/[a-z0-9.-]+(supabase\.co|\.space)(:\d+)?$/.test(parts[0])) return parts[0];
    }
  } catch {}
  return defaultUrl;
}

export function buildClientPublicConfigJson(req?: Request): string {
  const host = req?.headers?.host || "localhost:3000";
  const protocol = req?.headers?.["x-forwarded-proto"] || "http";
  const origin = `${protocol}://${host}`;
  const supabaseUrl = process.env.GAME_ORIGIN || process.env.SUPABASE_PUBLIC_URL || process.env.API_EXTERNAL_URL || process.env.SUPABASE_PROXY_URL || origin;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.ANON_KEY || "";
  return JSON.stringify({ supabaseUrl, supabaseAnonKey, websocketUrl: process.env.NEXT_PUBLIC_WEBSOCKET_URL || `ws://${host}/ws`, apiOrigin: process.env.API_EXTERNAL_URL || origin, posthogApiKey: process.env.NEXT_PUBLIC_POSTHOG_KEY || "", posthogHost: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com", environment: process.env.NODE_ENV || "development", buildHash: process.env.BUILD_COMMIT_SHA || "dev" });
}

function envTruthy(key: string): boolean { const v = process.env[key]?.trim().toLowerCase(); return v === "true" || v === "1" || v === "yes"; }
function shouldProxyBody(method: string): boolean { return ["POST", "PUT", "PATCH", "DELETE"].includes(method.toUpperCase()); }
function canAccessPlaytesterMonitor(req: Request): boolean { const token = PlaytesterConfig.monitorToken; if (!token) return true; return req.query.token as string === token; }
function safeHealthValue<T>(fn: () => T, fallback: T): T { try { return fn(); } catch { return fallback; } }

export class ServerBootstrap {
  private initializing = true;

  async start() {
    const app = express();
    const httpServer = createServer(app);
    const selfHealingRuntime: any = { getStatus: () => ({ featuresProtected: 0, config: {}, active: false, totalErrors: 0, totalHealed: 0, healingRate: 0 }) };
    const supabaseProxyBaseUrl = resolveSupabaseProxyBaseUrl();
    await initRedisClient();
    app.use("/api/mcp", mcpRoute());
    app.use("/api/admin/content", adminContentRouter());
    app.use("/api/vote", voteRouter());
    app.use("/api/are/validate", areValidationRouter());
    app.use("/api/are/replay", areReplayRouter());
    app.use("/api/sovereign/deploy", sovereignDeployRouter());
    app.use("/api/mcp", mcpRoute());
    app.use("/api/v1", scienceMascotRouter());
    app.use("/api/v1/warfront", warfrontRouter());
    app.use("/api/leaderboard", leaderboardRouter());
    app.use("/api/questlines", questlineRouter());
    app.use("/api/lore", loreRouter());
    app.get("/client-config.json", (_req, res) => { res.type("application/json"); res.setHeader("Cache-Control", "no-store"); res.send(buildClientPublicConfigJson(_req)); });
    app.get("/health", (_req, res) => {
      const tick = (this as any)._tick as WorldTick | undefined;
      const selfHealingStatus = safeHealthValue(() => selfHealingRuntime.getStatus(), { active: false, config: {}, totalErrors: 0, totalHealed: 0, healingRate: 0, featuresProtected: 0 } as any);
      const contentFallback: HealthContentSummary = { mode: "unknown", root: null };
      const supabaseFallback: HealthSupabaseSummary = { status: "unknown" };
      res.status(this.initializing ? 503 : 200).json({
        ok: !this.initializing,
        status: this.initializing ? "initializing" : "ok",
        project: "ARELORIAN MMORPG",
        version: "0.2.0",
        uptimeSeconds: Math.round(process.uptime()),
        port: Number(process.env.PORT || 3000),
        persistence: safeHealthValue(() => tick?.getPersistenceStats?.() ?? { status: "unknown" }, { status: "unknown" }),
        content: safeHealthValue<HealthContentSummary>(() => { const content = getContentDataSourceLabel(); return { mode: content.mode, root: content.root }; }, contentFallback),
        supabase: safeHealthValue<HealthSupabaseSummary>(() => getSupabaseSummary(), supabaseFallback),
        auth: { useSupabaseWsLogin: envTruthy("USE_SUPABASE_WS_LOGIN"), requireSupabaseAuth: envTruthy("REQUIRE_SUPABASE_AUTH"), allowGuestLogin: !["0", "false", "no"].includes(process.env.ALLOW_GUEST_LOGIN?.trim().toLowerCase() || ""), allowDevLogin: !["0", "false", "no"].includes(process.env.ALLOW_DEV_LOGIN?.trim().toLowerCase() || "") },
        selfHealing: { active: Boolean(selfHealingStatus.active), patchMode: selfHealingStatus.config?.patchMode ?? "disabled", totalErrors: selfHealingStatus.totalErrors ?? 0, totalHealed: selfHealingStatus.totalHealed ?? 0, healingRate: selfHealingStatus.healingRate ?? 0, featuresProtected: selfHealingStatus.featuresProtected ?? 0 },
        are: { guard: safeHealthValue(() => tick?.getAREGuardStatus?.() ?? null, null), worldHash: safeHealthValue(() => tick?.getWorldHashSnapshot?.()?.worldHash ?? null, null), replay: safeHealthValue(() => tick?.getReplayRecorderStats?.() ?? null, null) }
      });
    });
    app.get("/", (req, res, next) => { if (req.headers["user-agent"]?.includes("GoogleHC")) return res.status(200).send("OK"); next(); });
    app.use("/auth/v1", async (req, res) => {
      const resolvedProxyBaseUrl = resolveSupabaseProxyBaseUrlForRequest(req, supabaseProxyBaseUrl);
      if (!resolvedProxyBaseUrl) return res.status(502).json({ error: "supabase_auth_proxy_not_configured", message: "SUPABASE_URL/SUPABASE_PUBLIC_URL is missing and no valid Supabase apikey/ref was provided." });
      try {
        let bufferedBody: Buffer | undefined;
        if (shouldProxyBody(req.method)) {
          bufferedBody = await new Promise<Buffer>((resolve, reject) => {
            const chunks: Buffer[] = [];
            req.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
            req.on("end", () => resolve(Buffer.concat(chunks)));
            req.on("error", reject);
          });
        }
        const targetPath = req.originalUrl.replace(/^\/auth\/v1/, "/auth/v1");
        const targetUrl = `${resolvedProxyBaseUrl}${targetPath}`;
        const headers: Record<string, string> = {};
        for (const [key, value] of Object.entries(req.headers)) { if (key.toLowerCase() === "host" || typeof value === "undefined") continue; headers[key] = Array.isArray(value) ? value.join(",") : String(value); }
        if (!headers.apikey && process.env.SUPABASE_ANON_KEY) headers.apikey = process.env.SUPABASE_ANON_KEY;
        if (!headers.authorization && process.env.SUPABASE_ANON_KEY) headers.authorization = `Bearer ${process.env.SUPABASE_ANON_KEY}`;
        const upstream = await fetch(targetUrl, { method: req.method, headers, body: bufferedBody as any, redirect: "manual" });
        res.status(upstream.status);
        upstream.headers.forEach((value, key) => { if (!["content-encoding", "transfer-encoding", "connection"].includes(key.toLowerCase())) res.setHeader(key, value); });
        const arrayBuffer = await upstream.arrayBuffer();
        return res.send(Buffer.from(arrayBuffer));
      } catch (err: any) {
        return res.status(502).json({ error: "supabase_auth_proxy_failed", message: err?.message || "Proxy request failed" });
      }
    });
    app.get("/admin/content", (_req, res, next) => {
      const clientRoot = resolveClientRoot();
      const distPath = path.join(clientRoot, "dist");
      const p = resolveAdminContentHtmlPath(clientRoot, distPath);
      if (p) return res.sendFile(p);
      return next();
    });
    app.get("/playtester-monitor", (req, res, next) => { if (!canAccessPlaytesterMonitor(req)) return res.status(403).send("Forbidden"); const clientRoot = resolveClientRoot(); const distPath = path.join(clientRoot, "dist"); const p = resolvePlaytesterMonitorHtmlPath(clientRoot, distPath); if (p) return res.sendFile(p); return next(); });
    app.get("/playtester-render-publisher", (req, res, next) => { if (!canAccessPlaytesterMonitor(req)) return res.status(403).send("Forbidden"); const clientRoot = resolveClientRoot(); const distPath = path.join(clientRoot, "dist"); const p = resolvePlaytesterPublisherHtmlPath(clientRoot, distPath); if (p) return res.sendFile(p); return next(); });
    const clientRoot = resolveClientRoot(); const distPath = path.join(clientRoot, "dist"); if (existsSync(distPath)) app.use(express.static(distPath)); else app.use(express.static(clientRoot));
    app.use("/world-assets", express.static(resolveWorldAssetsDir()));
    const mirroredWorldAssetsDir = resolveMirroredWorldAssetsDir(); if (mirroredWorldAssetsDir) app.use("/world-assets-mirror", express.static(mirroredWorldAssetsDir));
    const contentDir = resolveContentDir(""); if (existsSync(contentDir)) app.use("/game-data", express.static(contentDir));
    registerSelfHealingDashboard(app);
    const tick = new WorldTick(); (this as any)._tick = tick; tick.start();
    const ws = new GameWebSocketServer(httpServer, tick); void ws;
    const monitorStream = new PlaytesterMonitorStream(httpServer); void monitorStream;
    const webrtcSignaling = new PlaytesterWebRTCSignaling(httpServer); void webrtcSignaling;
    const port = Number(process.env.PORT || process.env.GAME_PORT || 3000);
    httpServer.listen(port, "0.0.0.0", () => { this.initializing = false; console.log(`[Server] Arelorian server listening on 0.0.0.0:${port}`); });
    process.once("SIGTERM", () => { void shutdownPostHog().finally(() => process.exit(0)); });
    process.once("SIGINT", () => { void shutdownPostHog().finally(() => process.exit(0)); });
  }
}
