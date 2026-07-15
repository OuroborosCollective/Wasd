import { shutdownPostHog } from "../services/posthog.js";
import express, { type Request } from "express";
import { createServer } from "node:http";
import { existsSync } from "node:fs";
import { GameWebSocketServer } from "../networking/WebSocketServer.js";
import { worldTickAdapter } from "./are/WorldTickThinShellAdapter.js";
import { tickContextProvider } from "./are/TickSystemContextProvider.js";
import { installClient2DPublicKeyLoginBridge } from "./installClient2DPublicKeyLoginBridge.js";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mcpRoute } from "../api/mcpRoute.js";
import { adminContentRouter } from "../api/adminContentRoute.js";
import { adminAuthMiddleware } from "../middleware/adminAuthMiddleware.js";
import { adminRateLimiter } from "../middleware/rateLimitMiddleware.js";
import { voteRouter } from "../api/voteRoute.js";
import { leaderboardRouter } from "../api/leaderboardRoute.js";
import { questlineRouter } from "../api/questlineRoute.js";
import { loreRouter } from "../api/loreRoute.js";
import { scienceMascotRouter } from "../api/scienceMascotRoute.js";
import { warfrontRouter } from "../api/warfrontRoute.js";
import { areValidationRouter } from "../api/areValidationRoute.js";
import { areReplayRouter } from "../api/areReplayRoute.js";
import { financeRouter } from "../api/financeRoute.js";
import { createAREHeartbeatRouter } from "../routes/areHeartbeat.js";
import { createGameplaySnapshotRouter } from "../routes/gameplaySnapshot.js";
import { questEventRouter } from "../routes/questEventRoute.js";
import { default as skillEventRouter } from "../routes/skillEventRoute.js";
import { default as resourceGatherRouter } from "../routes/resourceGatherRoute.js";
import { default as inventoryRouter } from "../routes/inventoryRoute.js";
import { sovereignDeployRouter } from "../api/sovereignDeployRoute.js";
import { healthRoutes } from "../api/healthRoutes.js";
import { agoraRouter } from "../api/agoraRoute.js";
import { client2dAssetUploadRouter } from "../api/client2dAssetUploadRoute.js";
import { areShadowLogRouter } from "../api/areShadowLogRoute.js";
import { createManifestResyncRouter } from "../api/manifestResyncRoute.js";
import { getContentDataSourceLabel, resolveContentDir } from "../modules/content/contentDataRoot.js";
import { getSupabaseSummary, verifySupabaseToken } from "../config/supabase.js";
import { resolveWorldAssetsDir } from "./resolveWorldAssetsDir.js";
import { resolveMirroredWorldAssetsDir } from "./resolveMirroredWorldAssetsDir.js";
import { registerSelfHealingDashboard } from "../selfhealing/SelfHealingDashboard.js";
import { createSelfHealWorkshopRouter } from "../routes/selfHealWorkshopRoute.js";
import { createLootRoutes } from "../routes/lootRoutes.js";
import { default as craftingRouter } from "../routes/craftingRoute.js";
import { default as equipmentRouter } from "../routes/equipmentRoute.js";
import { default as onboardingRouter } from "../routes/onboardingRoute.js";
import { default as characterRouter } from "../character/characterRoute.js";
import { default as economyRouter } from "../economy/economyRoute.js";
import { default as vendorRouter } from "../npc/VendorRoutes.js";
import { default as campNpcRouter } from "../npc/CampNpcRoutes.js";
import { default as npcQuestRouter } from "../quests/npcQuestRoute.js";
import { PlaytesterConfig } from "../config/PlaytesterConfig.js";
import { PlaytesterMonitorStream } from "../modules/playtester/PlaytesterMonitorStream.js";
import { PlaytesterWebRTCSignaling } from "../modules/playtester/PlaytesterWebRTCSignaling.js";
import { initRedisClient } from "./RedisClient.js";
import { installARELootIntegration } from "../modules/loot/installARELootIntegration.js";
import { installOracleChatBridge } from "../modules/oracle/index.js";
import { initializeLivingLanguageSystem } from "./language/LivingLanguageInitializer.js";
import { URL } from "node:url";
import { createAssetBrainRouter } from "../api/assetBrainRoute.js";
import { createGLBUploadRouter } from "../api/glbUploadRoute.js";

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

function resolveClient2DGraphicRiverIsoPublicDir(): string {
  const root = process.env.CLIENT2D_GRAPHICRIVER_ISO_ROOT || "/opt/areloria/private-assets/graphicriver-iso";
  return path.join(path.resolve(root), "public");
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
    app.use("/api/mcp", adminRateLimiter, mcpRoute());
    app.use("/api/v1", scienceMascotRouter());
    app.use("/api/client2d-assets", adminRateLimiter, adminAuthMiddleware, client2dAssetUploadRouter());
    app.use("/api/leaderboard", leaderboardRouter());
    app.use("/api/questlines", questlineRouter());
    app.use("/api/lore", loreRouter());
    app.get("/client-config.json", (_req, res) => { res.type("application/json"); res.setHeader("Cache-Control", "no-store"); res.send(buildClientPublicConfigJson(_req)); });
    app.use("/health", healthRoutes({ getTick: () => (this as any)._tick as WorldTick | undefined, isInitializing: () => this.initializing, getPort: () => Number(process.env.PORT || 3000) }));
    app.use("/agora", agoraRouter({ getTick: () => (this as any)._tick as WorldTick | undefined, isInitializing: () => this.initializing, getPort: () => Number(process.env.PORT || 3000) }));
    app.get("/health", (_req, res) => {
      const tick = (this as any)._tick as WorldTick | undefined;
      const selfHealingStatus = safeHealthValue(() => selfHealingRuntime.getStatus(), { active: false, config: {}, totalErrors: 0, totalHealed: 0, healingRate: 0, featuresProtected: 0 } as any);
      res.status(this.initializing ? 503 : 200).json({
        ok: !this.initializing,
        status: this.initializing ? "initializing" : "ok",
        project: "ARELORIAN MMORPG",
        version: "0.2.0",
        uptimeSeconds: Math.round(process.uptime()),
        port: Number(process.env.PORT || 3000),
        persistence: safeHealthValue(() => tick?.getPersistenceStats?.() ?? { status: "unknown" }, { status: "unknown" }),
        content: safeHealthValue<HealthContentSummary>(() => { const content = getContentDataSourceLabel(); return { mode: content.mode, root: content.root }; }, { mode: "unknown", root: null }),
        supabase: safeHealthValue<HealthSupabaseSummary>(() => getSupabaseSummary(), { status: "unknown" }),
        auth: { useSupabaseWsLogin: envTruthy("USE_SUPABASE_WS_LOGIN"), requireSupabaseAuth: envTruthy("REQUIRE_SUPABASE_AUTH"), allowGuestLogin: !["0", "false", "no"].includes(process.env.ALLOW_GUEST_LOGIN?.trim().toLowerCase() || ""), allowDevLogin: !["0", "false", "no"].includes(process.env.ALLOW_DEV_LOGIN?.trim().toLowerCase() || "") },
        selfHealing: { active: Boolean(selfHealingStatus.active), patchMode: selfHealingStatus.config?.patchMode ?? "disabled", totalErrors: selfHealingStatus.totalErrors ?? 0, totalHealed: selfHealingStatus.totalHealed ?? 0, healingRate: selfHealingStatus.healingRate ?? 0, featuresProtected: selfHealingStatus.featuresProtected ?? 0 },
        are: { guard: safeHealthValue(() => tick?.getAREGuardStatus?.() ?? null, null), worldHash: safeHealthValue(() => tick?.getWorldHashSnapshot?.()?.worldHash ?? null, null), replay: safeHealthValue(() => tick?.getReplayRecorderStats?.() ?? null, null), warfront: safeHealthValue(() => tick?.warfrontSystem?.getCycleSnapshot?.() ?? null, null) }
      });
    });
    app.get("/", (req, res, next) => { if (req.headers["user-agent"]?.includes("GoogleHC")) return res.status(200).send("OK"); next(); });
    app.use("/auth/v1", async (req, res) => {
      const resolvedProxyBaseUrl = resolveSupabaseProxyBaseUrlForRequest(req, supabaseProxyBaseUrl);
      if (!resolvedProxyBaseUrl) return res.status(502).json({ error: "supabase_auth_proxy_not_configured", message: "SUPABASE_URL/SUPABASE_PUBLIC_URL is missing and no valid Supabase apikey/ref was provided." });
      try {
        let bufferedBody: Buffer | undefined;
        if (shouldProxyBody(req.method)) bufferedBody = await new Promise<Buffer>((resolve, reject) => { const chunks: Buffer[] = []; req.on("data", (c: Buffer) => chunks.push(c)); req.on("end", () => resolve(Buffer.concat(chunks))); req.on("error", (err) => reject(err)); });
        let upstreamPath = req.originalUrl;
        let transformedBody: string | undefined;
        if (req.method === "POST" && req.originalUrl.includes("/token") && !req.originalUrl.includes("grant_type=") && bufferedBody) {
          try { const parsed = JSON.parse(bufferedBody.toString()); if (parsed.grant_type) { upstreamPath = `${upstreamPath}${upstreamPath.includes("?") ? "&" : "?"}grant_type=${encodeURIComponent(parsed.grant_type)}`; delete parsed.grant_type; transformedBody = JSON.stringify(parsed); } } catch {}
        }
        const headers = { ...req.headers };
        delete headers.host;
        delete headers["content-length"];
        const init: RequestInit = { method: req.method, headers: headers as any, redirect: "manual" };
        if (shouldProxyBody(req.method)) { init.body = (transformedBody ?? bufferedBody) as any; (init as any).duplex = "half"; }
        const response = await fetch(String(resolvedProxyBaseUrl + upstreamPath), init);
        res.status(response.status);
        response.headers.forEach((value, key) => { const lower = key.toLowerCase(); if (lower === "content-length" || lower === "content-encoding") return; res.setHeader(key, value); });
        const respData = await response.arrayBuffer();
        res.send(Buffer.from(respData));
      } catch (err) { console.error("[AuthProxy] Failed to forward request to Supabase:", err); return res.status(502).json({ error: "supabase_auth_proxy_upstream_failed", message: "Network problem while contacting Supabase." }); }
    });
    const ws = new GameWebSocketServer(httpServer);
    ws.start();
    const tick = worldTickAdapter;
    installClient2DPublicKeyLoginBridge(ws, tick);
    (this as any)._tick = tick;
    await tick.init();
    
    // Initialize Living Language System (NPC dialogue + speech generation)
    await initializeLivingLanguageSystem();
    
    this.initializing = false;
    app.use("/api/v1/warfront", adminRateLimiter, warfrontRouter(tick));
    app.use("/api/are/validation", adminRateLimiter, areValidationRouter(tick));
    app.use("/api/are/replay", adminRateLimiter, areReplayRouter(tick));
    app.use("/api/are", createAREHeartbeatRouter(tick, ws));
    app.use("/api/gameplay", createGameplaySnapshotRouter());
    app.use("/api/quest", questEventRouter);
    app.use("/api/skill", skillEventRouter);
    app.use("/api/resource", resourceGatherRouter);
    app.use("/api/inventory", inventoryRouter);
    app.use("/api/crafting", craftingRouter);
    app.use("/api/equipment", equipmentRouter);
    app.use("/api/character", characterRouter);
    app.use("/api/onboarding", onboardingRouter);
    app.use("/api/economy", economyRouter);
    app.use("/api/npc", vendorRouter);
    app.use("/api/npc", campNpcRouter);
    app.use("/api/npc", npcQuestRouter);
    app.use("/api/quests", npcQuestRouter);
    app.use("/api/self-healing", adminRateLimiter, adminAuthMiddleware, createSelfHealWorkshopRouter());
    app.use("/api/manifest", adminRateLimiter, createManifestResyncRouter(tick));
    app.use("/api/finance", adminRateLimiter, express.json({ limit: "1mb" }), financeRouter());
    app.use("/api/are-shadow", adminRateLimiter, adminAuthMiddleware, areShadowLogRouter());
    app.use("/api/asset-brain", adminRateLimiter, createAssetBrainRouter());
    app.use("/api/glb", adminRateLimiter, createGLBUploadRouter());
    app.use("/api/sovereign/deploy", adminRateLimiter, adminAuthMiddleware, sovereignDeployRouter(tick));
    const monitorStream = new PlaytesterMonitorStream(httpServer, (options) => tick.buildPlaytesterMonitorPayload(options));
    monitorStream.start();
    const playtesterSignaling = new PlaytesterWebRTCSignaling(httpServer);
    playtesterSignaling.start();
    const monitorClientRoot = resolveClientRoot();
    const monitorHtmlPath = resolvePlaytesterMonitorHtmlPath(monitorClientRoot, path.join(monitorClientRoot, "dist"));
    const publisherHtmlPath = resolvePlaytesterPublisherHtmlPath(monitorClientRoot, path.join(monitorClientRoot, "dist"));
    if (monitorHtmlPath) app.get("/playtester-monitor.html", (req, res) => { if (!canAccessPlaytesterMonitor(req)) return res.status(403).json({ error: "forbidden" }); res.sendFile(monitorHtmlPath); });
    if (publisherHtmlPath) app.get("/playtester-render-publisher.html", (req, res) => { if (!canAccessPlaytesterMonitor(req)) return res.status(403).json({ error: "forbidden" }); res.sendFile(publisherHtmlPath); });
    app.get("/api/playtester/debug-log", (req, res) => { if (!canAccessPlaytesterMonitor(req)) return res.status(403).json({ error: "forbidden" }); res.json({ ok: Boolean(tick.getPlaytesterDebugLogPath()), enabled: PlaytesterConfig.enabled, streamEnabled: PlaytesterConfig.streamEnabled, monitorMode: PlaytesterConfig.monitorMode, monitorPath: PlaytesterConfig.monitorPath, monitorSignalPath: PlaytesterConfig.monitorSignalPath, monitorPublisherPath: PlaytesterConfig.monitorPublisherPath, monitorTokenRequired: PlaytesterConfig.monitorToken.length > 0, stream: { width: PlaytesterConfig.streamWidth, height: PlaytesterConfig.streamHeight, fps: PlaytesterConfig.streamFps, quality: PlaytesterConfig.streamQuality, shadows: PlaytesterConfig.streamShadows, particles: PlaytesterConfig.streamParticles, renderDistance: PlaytesterConfig.streamRenderDistance, iceServers: PlaytesterConfig.streamIceServers }, debugLogPath: tick.getPlaytesterDebugLogPath() }); });
    app.use("/api/admin/content", adminRateLimiter, adminAuthMiddleware, adminContentRouter(tick));
    // ARE Infinite Loot Machine Admin Routes
    createLootRoutes(app);
    app.use("/api/vote", voteRouter(tick));
    const clientRoot = resolveClientRoot();
    const clientPath = path.join(clientRoot, "dist");
    const portalPath = path.join(clientPath, "portal");
    const portalIndexPath = path.join(portalPath, "index.html");
    const rootIndexPath = path.join(clientPath, "index.html");
    const itchClientPath = path.join(clientRoot, "dist-itch");
    const adminContentPath = resolveAdminContentHtmlPath(clientRoot, clientPath);
    if (adminContentPath) app.get("/admin-content.html", (_req, res) => res.sendFile(adminContentPath));
    if (existsSync(path.join(itchClientPath, "index.html"))) { app.use("/itch", express.static(itchClientPath, { index: "index.html" })); app.get("/itch/*", (_req, res) => res.sendFile(path.join(itchClientPath, "index.html"))); }
    
    // 2D Client - SPA fallback to index.html
    const client2DPath = path.join(clientPath, "2d");
    const client2DIndexPath = path.join(client2DPath, "index.html");
    // Prevent stale HTML/build-stamp caching - always fresh for 2D client
    app.use("/2d", (_req, _res, next) => {
      // Inject no-store headers for HTML and build-stamp
      // This ensures browsers get fresh content after deployment
      _res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      next();
    });
    app.use("/2d", express.static(client2DPath, { index: "index.html", fallthrough: true }));
    app.use("/2d", (_req, res) => {
      // Ensure build-stamp.json and index.html have no-cache headers
      const ext = path.extname(_req.path).toLowerCase();
      if (ext === ".html" || ext === ".json" || _req.path.includes("build-stamp")) {
        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
      }
      if (existsSync(client2DIndexPath)) return res.sendFile(client2DIndexPath);
      if (existsSync(rootIndexPath)) return res.sendFile(rootIndexPath);
      return res.status(503).type("text/plain").send("Areloria 2D client assets are not available.");
    });
    
    // 3D Client - SPA fallback to index.html
    const client3DPath = path.join(clientPath, "3d");
    const client3DIndexPath = path.join(client3DPath, "index.html");
    app.use("/3d", express.static(client3DPath, { index: "index.html", fallthrough: true }));
    app.use("/3d", (_req, res) => {
      if (existsSync(client3DIndexPath)) return res.sendFile(client3DIndexPath);
      if (existsSync(rootIndexPath)) return res.sendFile(rootIndexPath);
      return res.status(503).type("text/plain").send("Areloria 3D client assets are not available.");
    });
    
    app.use("/portal", express.static(portalPath, { index: "index.html", fallthrough: true }));
    app.use("/portal", (_req, res) => {
      if (existsSync(portalIndexPath)) return res.sendFile(portalIndexPath);
      if (existsSync(rootIndexPath)) return res.sendFile(rootIndexPath);
      return res.status(503).type("text/plain").send("Areloria portal assets are not available in this container build.");
    });
    if (process.env.NODE_ENV !== "production") {
      try { const vite = await import("vite"); const viteServer = await vite.createServer({ server: { middlewareMode: true }, appType: "spa", root: clientRoot }); app.use(viteServer.middlewares); }
      catch (e) { console.error("Failed to start Vite middleware", e); app.use(express.static(clientPath)); }
    } else {
      app.use((req, res, next) => { if (req.url?.endsWith(".wasm")) { res.setHeader("Content-Type", "application/wasm"); res.setHeader("Cross-Origin-Opener-Policy", "same-origin"); res.setHeader("Cross-Origin-Embedder-Policy", "require-corp"); } next(); });
      app.use(express.static(clientPath));
    }
    const client2DGraphicRiverIsoDir = resolveClient2DGraphicRiverIsoPublicDir();
    if (existsSync(client2DGraphicRiverIsoDir)) app.use("/client2d-assets/graphicriver-iso", express.static(client2DGraphicRiverIsoDir, { maxAge: process.env.NODE_ENV === "production" ? "7d" : 0, fallthrough: false }));
    const mirroredWorld = resolveMirroredWorldAssetsDir();
    const worldAssetsDir = mirroredWorld ?? resolveWorldAssetsDir();
    if (worldAssetsDir) app.use("/world-assets", express.static(worldAssetsDir, { maxAge: process.env.NODE_ENV === "production" ? "7d" : 0, fallthrough: false }));
    try { const worldDir = resolveContentDir("world"); if (existsSync(worldDir)) app.use("/world", express.static(worldDir, { maxAge: process.env.NODE_ENV === "production" ? "1h" : 0, fallthrough: true })); } catch {}
    const port = Number(process.env.PORT || 3000);
    httpServer.listen(port, () => {
        console.log(`Arelorian server listening on ${port}`);
        
        // Phase 11: Start tick context provider with WorldTick integration
        // This ensures all HTTP routes have deterministic tick context
        // Use liveHeal.getStatus().tickCount as a stable public accessor to tickCount
        const tickUpdateInterval = setInterval(() => {
          const status = (tick as any).liveHeal?.getStatus?.();
          const currentTick = status?.tickCount ?? 0;
          tickContextProvider.updateTick(currentTick);
        }, 100); // Update every 100ms (10Hz)
        
        tick.start();
        
        // Install ARE Infinite Loot Machine
        installARELootIntegration(tick);
        
        // Install Oracle Chat Bridge for prophecy broadcasts
        installOracleChatBridge(tick);
        
        const shutdownHandler = async () => { 
          console.log("[Shutdown] Flushing data..."); 
          playtesterSignaling.stop(); 
          monitorStream.stop(); 
          tick.liveHeal.flush(); 
          tick.assetHealthService.flush();
          
          // SHADOW-LOG FLUSH: Synchronous guarantee for I/O-Kausalität
          const { AREShadowAdapter } = await import('./are/AREShadowAdapter.js');
          const logSink = AREShadowAdapter.getLogSink();
          await logSink.flush();
          console.log("[Shutdown] ARE Shadow Log Sink geflushed");
          
          try { await shutdownPostHog(); } catch (e) { console.warn("[Shutdown] PostHog shutdown failed", e); } 
          process.exit(0); 
        };
        process.on("SIGTERM", shutdownHandler);
        process.on("SIGINT", shutdownHandler);
    });
  }
}
