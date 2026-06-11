import { shutdownPostHog } from "../services/posthog.js";
import express, { type Request } from "express";
import { createServer } from "node:http";
import { existsSync } from "node:fs";
import { GameWebSocketServer } from "../networking/WebSocketServer.js";
import { worldTickAdapter, type WorldTick } from "./are/WorldTickThinShellAdapter.js";
import { tickContextProvider } from "./are/TickSystemContextProvider.js";
import { installClient2DPublicKeyLoginBridge } from "./installClient2DPublicKeyLoginBridge.js";
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
    app.use("/api/mcp", mcpRoute());
    app.use("/api/v1", scienceMascotRouter());
    app.use("/api/client2d-assets", client2dAssetUploadRouter());
    app.use("/api/leaderboard", leaderboardRouter());
    app.use("/api/questlines", questlineRouter());
    app.use("/api/lore", loreRouter());
    app.get("/client-config.json", (_req, res) => { res.type("application/json"); res.setHeader("Cache-Control", "no-store"); res.send(buildClientPublicConfigJson(_req)); });
    app.use("/health", healthRoutes({ getTick: () => (this as any)._tick as WorldTick | undefined, isInitializing: () => this.initializing, getPort: () => Number(process.env.PORT || 3000) }));
    app.use("/agora", agoraRouter({ getTick: () => (this as any)._tick as WorldTick | undefined, isInitializing: () => this.initializing, getPort: () => Number(process.env.PORT || 3000) }));
    const tick = worldTickAdapter;
    (this as any)._tick = tick;
    app.get("/health", (_req, res) => {
      const activeTick = (this as any)._tick as WorldTick | undefined;
      const selfHealingStatus = safeHealthValue(() => selfHealingRuntime.getStatus(), { active: false, config: {}, totalErrors: 0, totalHealed: 0, healingRate: 0, featuresProtected: 0 } as any);
      res.status(this.initializing ? 503 : 200).json({
        ok: !this.initializing,
        status: this.initializing ? "initializing" : "ok",
        project: "ARELORIAN MMORPG",
        version: "0.2.0",
        uptimeSeconds: Math.round(process.uptime()),
        port: Number(process.env.PORT || 3000),
        persistence: safeHealthValue(() => activeTick?.getPersistenceStats?.() ?? { status: "unknown" }, { status: "unknown" }),
        content: safeHealthValue<HealthContentSummary>(() => { const content = getContentDataSourceLabel(); return { mode: content.mode, root: content.root }; }, { mode: "unknown", root: null }),
        supabase: safeHealthValue<HealthSupabaseSummary>(() => getSupabaseSummary(), { status: "unknown" }),
        auth: { useSupabaseWsLogin: envTruthy("USE_SUPABASE_WS_LOGIN"), requireSupabaseAuth: envTruthy("REQUIRE_SUPABASE_AUTH"), allowGuestLogin: !["0", "false", "no"].includes(process.env.ALLOW_GUEST_LOGIN?.trim().toLowerCase() || ""), allowDevLogin: !["0", "false", "no"].includes(process.env.ALLOW_DEV_LOGIN?.trim().toLowerCase() || "") },
        selfHealing: { active: Boolean(selfHealingStatus.active), patchMode: selfHealingStatus.config?.patchMode ?? "disabled", totalErrors: selfHealingStatus.totalErrors ?? 0, totalHealed: selfHealingStatus.totalHealed ?? 0, healingRate: selfHealingStatus.healingRate ?? 0, featuresProtected: selfHealingStatus.featuresProtected ?? 0 },
        are: { guard: safeHealthValue(() => activeTick?.getAREGuardStatus?.() ?? null, null), worldHash: safeHealthValue(() => activeTick?.getWorldHashSnapshot?.()?.worldHash ?? null, null), replay: safeHealthValue(() => activeTick?.getReplayRecorderStats?.() ?? null, null), warfront: safeHealthValue(() => activeTick?.warfrontSystem?.getCycleSnapshot?.() ?? null, null) }
      });
    });
    app.get("/", (req, res, next) => { if (req.headers["user-agent"]?.includes("GoogleHC")) return res.status(200).send("OK"); next(); });
    app.use(express.json({ limit: "25mb", type: shouldProxyBody as any }));
    app.use("/api/admin-content", adminContentRouter());
    app.use("/api/vote", voteRouter(tick as any));
    app.use("/api/warfront", warfrontRouter(tick as any));
    app.use("/api/are/validation", areValidationRouter(tick as any));
    app.use("/api/are/replay", areReplayRouter(tick as any));
    app.use("/api/finance", financeRouter());
    app.use("/api/are/heartbeat", createAREHeartbeatRouter({ getTick: () => tick as any }));
    app.use("/api/gameplay", createGameplaySnapshotRouter(tick as any));
    app.use("/api/quest", questEventRouter(tick as any));
    app.use("/api/skills", skillEventRouter);
    app.use("/api/resources", resourceGatherRouter);
    app.use("/api/inventory", inventoryRouter);
    app.use("/api/sovereign-deploy", sovereignDeployRouter());
    app.use("/api/are/shadow", areShadowLogRouter());
    app.use("/api/manifest", createManifestResyncRouter(tick as any));
    app.use("/api/self-heal", createSelfHealWorkshopRouter());
    app.use("/api/loot", createLootRoutes(tick as any));
    app.use("/api/crafting", craftingRouter);
    app.use("/api/equipment", equipmentRouter);
    app.use("/api/onboarding", onboardingRouter);
    app.use("/api/character", characterRouter);
    app.use("/api/economy", economyRouter);
    app.use("/api/vendor", vendorRouter);
    app.use("/api/camp", campNpcRouter);
    app.use("/api/npc-quests", npcQuestRouter);
    const ws = new GameWebSocketServer(httpServer, tick as any);
    (tick as any).ws = ws;
    installClient2DPublicKeyLoginBridge(ws, tick as any);
    const monitorStream = new PlaytesterMonitorStream();
    const playtesterSignaling = new PlaytesterWebRTCSignaling(monitorStream);
    registerSelfHealingDashboard(app, selfHealingRuntime as any);
    try { const worldDir = resolveContentDir("world"); if (existsSync(worldDir)) app.use("/world", express.static(worldDir, { maxAge: process.env.NODE_ENV === "production" ? "1h" : 0, fallthrough: true })); } catch {}
    const port = Number(process.env.PORT || 3000);
    httpServer.listen(port, () => {
        console.log(`Arelorian server listening on ${port}`);
        const tickUpdateInterval = setInterval(() => {
          const status = (tick as any).liveHeal?.getStatus?.();
          const currentTick = status?.tickCount ?? 0;
          tickContextProvider.updateTick(currentTick);
        }, 100);
        tick.start();
        installARELootIntegration(tick as any);
        const shutdownHandler = async () => {
          console.log("[Shutdown] Flushing data...");
          clearInterval(tickUpdateInterval);
          playtesterSignaling.stop();
          monitorStream.stop();
          tick.liveHeal.flush();
          tick.assetHealthService.flush();
          try {
            const { AREShadowAdapter } = await import('./are/AREShadowAdapter.js');
            const logSink = AREShadowAdapter.getLogSink();
            await logSink.flush();
            console.log("[Shutdown] ARE Shadow Log Sink geflushed");
          } catch {}
          await tick.stop?.();
          await shutdownPostHog();
          process.exit(0);
        };
        process.once("SIGTERM", shutdownHandler);
        process.once("SIGINT", shutdownHandler);
        this.initializing = false;
    });
  }
}
