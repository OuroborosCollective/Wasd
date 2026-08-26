import { MMORPGClientCore } from "../core/MMORPGClientCore";
import { wantsMobileNetworkHints } from "../ui/touchUi";
import { applyStatsPayload } from "../state/playerState";
import { onChatMessage } from "../ui/chat";
import { setMinimapLocalPlayer, updateMinimapEntities, updateMinimapOverlayMarkers } from "../ui/minimap";
import { getWorldOverlaySnapshotBridge } from "../game/WorldOverlaySnapshotBridge";
import { buildMinimapMarkersFromOverlay, overlayStatusLabel, type MinimapMarker } from "../game/BabylonOverlayAdapter";
import { getWorldSurfaceBabylonRenderer } from "../game/WorldSurfaceBabylonRenderer";
import { showDeathScreen, hideDeathScreen } from "../ui/deathScreen";
import { showNotification, notifySuccess, notifyWarn } from "../ui/notifications";
import { applyPartySync } from "../state/partyState";
import { spawnFloatingNumber } from "../ui/floatingNumbers";
import { IMPACT_BUSTER_SKILL_ID } from "../game/impactBusterConfig";
import { setMobileImpactButtonState } from "../ui/mobileControls";
import { isImpactBusterUnlocked } from "../state/playerState";
import {
  pushEntitySyncToGameHud,
  pushGameHudConnected,
  pushLootDespawnedToGameHud,
  pushLootSpawnedToGameHud,
  pushProtocolMsgToGameHud,
} from "../ui/gameHudBridge";
import { applyQuestlineFeatures, applyQuestlineState } from "../state/questlineState";

let lastImpactPulseAt = 0;

function triggerImpactLocalPulse(at?: { x?: number; y?: number }, radius?: number) {
  const now = Date.now();
  if (now - lastImpactPulseAt < 120) return;
  lastImpactPulseAt = now;
  const gameCore = (window as any).gameCore as
    | { pulseScreenShakeAndFlash?: () => void }
    | undefined;
  if (typeof gameCore?.pulseScreenShakeAndFlash === "function") {
    gameCore.pulseScreenShakeAndFlash();
  }
  window.dispatchEvent(
    new CustomEvent("areloria:impact-buster-pulse", {
      detail: {
        at: now,
        x: Number(at?.x ?? 0),
        y: Number(at?.y ?? 0),
        radius: Number(radius ?? 5.5),
      },
    }),
  );
}

let globalWs: WebSocket | null = null;
const DEFAULT_SCENE_ID = "didis_hub";
const DEFAULT_SPAWN_KEY = "sp_player_default";
const GUEST_STORAGE_KEY = "areloria_guest_id";
let authTokenProvider: (() => Promise<string | null>) | null = null;

// --- Heartbeat ---
const HEARTBEAT_INTERVAL_MS = 30_000;
const HEARTBEAT_TIMEOUT_MS = 10_000;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let heartbeatTimeout: ReturnType<typeof setTimeout> | null = null;

function startHeartbeat(ws: WebSocket): void {
  stopHeartbeat();
  heartbeatTimer = setInterval(() => {
    if (ws.readyState !== WebSocket.OPEN) return;
    try {
      ws.send(JSON.stringify({ type: "ping" }));
    } catch { /* ignore */ }
    heartbeatTimeout = setTimeout(() => {
      console.warn("[WS] Heartbeat timeout — closing connection.");
      try { ws.close(4001, "heartbeat timeout"); } catch { /* ignore */ }
    }, HEARTBEAT_TIMEOUT_MS);
  }, HEARTBEAT_INTERVAL_MS);
}

function stopHeartbeat(): void {
  if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null; }
  if (heartbeatTimeout) { clearTimeout(heartbeatTimeout); heartbeatTimeout = null; }
}

// --- Auto-reconnect ---
let autoReconnectEnabled = true;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 20;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleAutoReconnect(core: MMORPGClientCore, options: ConnectionOptions): void {
  if (!autoReconnectEnabled) return;
  if (reconnectTimer) return; // Already scheduled
  reconnectAttempts++;
  if (reconnectAttempts > MAX_RECONNECT_ATTEMPTS) {
    emitNetStatus("error", "Reconnection failed after max attempts. Refresh to retry.");
    return;
  }
  const base = Math.min(1000 * Math.pow(2, reconnectAttempts - 1), 30000);
  const jitter = base * 0.3 * (Math.random() * 2 - 1);
  const delay = Math.max(500, Math.round(base + jitter));
  emitNetStatus("warning", `Reconnecting in ${Math.round(delay / 1000)}s (attempt ${reconnectAttempts})...`);
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connectSocket(core, options);
  }, delay);
}

function clearAutoReconnect(): void {
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
  reconnectAttempts = 0;
}

/** Last connectSocket target so we can reconnect after Google login refreshes the JWT. */
let reconnectTarget: { core: MMORPGClientCore; options: ConnectionOptions } | null = null;

export type InteractWirePayload =
  | { kind: "npc"; npcId: string }
  | { kind: "loot"; lootId: string };

type BoundWsHandlers = {
  core: MMORPGClientCore;
  onInput: (input: any) => void;
  onAttack: () => void;
  onInteract: (payload?: InteractWirePayload) => void;
};
let boundWsHandlers: BoundWsHandlers | null = null;
let wsConnectionGeneration = 0;

function detachSocketInputHandlers(): void {
  if (!boundWsHandlers) return;
  const { core, onInput, onAttack, onInteract } = boundWsHandlers;
  core.events.off("input", onInput);
  core.events.off("attack", onAttack);
  core.events.off("interact", onInteract);
  boundWsHandlers = null;
}

function scheduleReconnectAfterAuth(): void {
  if (!reconnectTarget) return;
  const { core, options } = reconnectTarget;
  window.setTimeout(() => {
    connectSocket(core, { ...options, token: undefined });
  }, 0);
}

/** Safe recovery hook: open a fresh WebSocket (e.g. AI watchdog after clearing bad auth state). */
export function reconnectGameSocket(): void {
  scheduleReconnectAfterAuth();
}

export type ConnectionOptions = {
  token?: string;
  charName?: string;
  sceneId?: string;
  spawnKey?: string;
  arePolicyConfig?: {
    cooldownMs?: number;
    lowFpsThreshold?: number;
    stableFpsThreshold?: number;
    lowSampleTrigger?: number;
    stableSampleTrigger?: number;
  };
};

type NetStatusKind =
  | "connecting"
  | "connected"
  | "login_sent"
  | "welcome"
  | "sync"
  | "warning"
  | "error"
  | "closed";

function emitNetStatus(kind: NetStatusKind, message: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("areloria:net-status", {
      detail: { kind, message, at: Date.now() },
    })
  );
}

type SpawnPosition = { x: number; y: number; z: number };

function toEntityPosition(spawnPosition?: Partial<SpawnPosition>) {
  if (!spawnPosition) {
    return null;
  }
  const x = Number(spawnPosition.x ?? 0);
  const y = Number(spawnPosition.y ?? 0);
  const z = Number(spawnPosition.z ?? 0);
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
    return null;
  }
  return { x, y, z };
}

function normalizeAREPayload(rawAre: any) {
  if (!rawAre || typeof rawAre !== "object") {
    return undefined;
  }
  const kappa = Number(rawAre.kappa);
  const logicalIndex = Number(rawAre.logicalIndex);
  const phaseShift = Number(rawAre.phaseShift);
  const resonance = Number(rawAre.resonance);
  const plexity = Number(rawAre.plexity);
  const kappaPosRaw = rawAre.kappaPos || {};
  const kappaPos = {
    x: Number(kappaPosRaw.x),
    y: Number(kappaPosRaw.y),
    z: Number(kappaPosRaw.z),
  };
  if (
    !Number.isFinite(kappa) ||
    !Number.isFinite(logicalIndex) ||
    !Number.isFinite(phaseShift) ||
    !Number.isFinite(resonance) ||
    !Number.isFinite(plexity) ||
    !Number.isFinite(kappaPos.x) ||
    !Number.isFinite(kappaPos.y) ||
    !Number.isFinite(kappaPos.z)
  ) {
    return undefined;
  }
  return {
    kappa,
    logicalIndex,
    phaseShift,
    resonance,
    plexity,
    chain: typeof rawAre.chain === "string" ? rawAre.chain : "",
    kappaPos,
  };
}

function normalizeWebSocketUrl(rawUrl: string | undefined): string | null {
  if (!rawUrl || rawUrl.trim().length === 0) {
    return null;
  }

  const value = rawUrl.trim();
  if (value.startsWith("ws://") || value.startsWith("wss://")) {
    return value;
  }

  if (value.startsWith("http://")) {
    return `ws://${value.slice("http://".length)}`;
  }

  if (value.startsWith("https://")) {
    return `wss://${value.slice("https://".length)}`;
  }

  return null;
}

function resolveWebSocketUrl() {
  const configuredUrl = normalizeWebSocketUrl(
    (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.VITE_WEBSOCKET_URL
  );

  if (configuredUrl) {
    return configuredUrl;
  }

  const protocol = location.protocol === "https:" ? "wss" : "ws";
  return `${protocol}://${location.host}/ws`;
}

function resolveInitialSceneId(configuredSceneId?: string) {
  if (configuredSceneId && configuredSceneId.trim().length > 0) {
    return configuredSceneId.trim();
  }
  const fromQuery = new URLSearchParams(location.search).get("sceneId");
  if (fromQuery && fromQuery.trim().length > 0) {
    return fromQuery.trim();
  }
  return DEFAULT_SCENE_ID;
}

function resolveInitialSpawnKey(configuredSpawnKey?: string) {
  if (configuredSpawnKey && configuredSpawnKey.trim().length > 0) {
    return configuredSpawnKey.trim();
  }
  const fromQuery = new URLSearchParams(location.search).get("spawnKey");
  if (fromQuery && fromQuery.trim().length > 0) {
    return fromQuery.trim();
  }
  return DEFAULT_SPAWN_KEY;
}

export function setAuthTokenProvider(fn: (() => Promise<string | null>) | null) {
  authTokenProvider = fn;
}

async function resolveTokenForLogin(fallback?: string): Promise<string | undefined> {
  if (authTokenProvider) {
    try {
      const fresh = await authTokenProvider();
      if (fresh && fresh.trim().length > 0) {
        return fresh.trim();
      }
    } catch {
      // fall through to fallback/persisted token
    }
  }
  if (fallback && fallback.trim().length > 0) {
    return fallback.trim();
  }
  try {
    const persisted = localStorage.getItem("token");
    if (persisted && persisted.trim().length > 0) {
      return persisted.trim();
    }
  } catch {
    // ignore storage access issues
  }
  return undefined;
}

export type UpdateAuthTokenOptions = { reconnect?: boolean };

export function updateAuthToken(token: string | null, opts?: UpdateAuthTokenOptions) {
  try {
    if (token && token.trim().length > 0) {
      localStorage.setItem("token", token.trim());
    } else {
      localStorage.removeItem("token");
    }
  } catch {
    // ignore storage access issues
  }
  if (globalWs?.readyState === WebSocket.OPEN || globalWs?.readyState === WebSocket.CONNECTING) {
    try {
      globalWs.close(4000, "auth refresh");
    } catch {
      /* ignore */
    }
  }
  if (opts?.reconnect) {
    scheduleReconnectAfterAuth();
  }
}

export function connectSocket(core: MMORPGClientCore, options: ConnectionOptions = {}) {
  reconnectTarget = { core, options: { ...options } };

  if (globalWs) {
    try {
      globalWs.close(4998, "reconnect");
    } catch {
      /* ignore */
    }
    globalWs = null;
  }
  detachSocketInputHandlers();

  wsConnectionGeneration += 1;
  const myGen = wsConnectionGeneration;

  if (options.arePolicyConfig && typeof core.setAREPolicyConfig === "function") {
    core.setAREPolicyConfig(options.arePolicyConfig);
  }
  emitNetStatus("connecting", "Connecting to game server...");
  const ws = new WebSocket(resolveWebSocketUrl());
  globalWs = ws;
  const sceneId = resolveInitialSceneId(options.sceneId);
  const spawnKey = resolveInitialSpawnKey(options.spawnKey);
  let welcomeReceived = false;
  let attemptedAnonymousFallback = false;

  const sendLogin = (token?: string, charName?: string) => {
    if (ws.readyState !== WebSocket.OPEN) return;
    const lowBandwidth = wantsMobileNetworkHints();
    ws.send(
      JSON.stringify({
        type: "login",
        token,
        charName,
        sceneId,
        spawnKey,
        ...(lowBandwidth ? { clientHints: { lowBandwidth: true } } : {}),
      })
    );
    emitNetStatus("login_sent", token ? "Authenticating..." : "Joining world (guest fallback)...");
  };

  ws.onopen = async () => {
    if (myGen !== wsConnectionGeneration || ws !== globalWs) return;
    clearAutoReconnect(); // Reset backoff on successful connect
    startHeartbeat(ws); // Start ping/pong heartbeat
    console.log("Connected to Arelorian Server");
    pushGameHudConnected(false);
    emitNetStatus("connected", "Connected. Waiting for world login...");
    const token = await resolveTokenForLogin(options.token);
    let guestId: string | undefined;
    if (!token) {
      try {
        const stored = localStorage.getItem(GUEST_STORAGE_KEY);
        if (stored && /^guest_[a-zA-Z0-9_-]{6,64}$/.test(stored)) {
          guestId = stored;
        }
      } catch {
        // ignore storage access issues
      }
    }
    sendLogin(token, options.charName);

    window.setTimeout(() => {
      if (!welcomeReceived && !attemptedAnonymousFallback && ws.readyState === WebSocket.OPEN) {
        attemptedAnonymousFallback = true;
        try {
          localStorage.removeItem("token");
        } catch {
          // localStorage may be unavailable in hardened browser modes.
        }
        console.warn("[WS] No welcome received, retrying login without token.");
        emitNetStatus("warning", "Login timeout. Retrying without stored token...");
        sendLogin(undefined);
      }
    }, 6000);

    const onInput = (input: any) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "input", input }));
      }
    };
    const onAttack = () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "attack" }));
      }
    };
    const onInteract = (detail?: InteractWirePayload) => {
      if (ws.readyState !== WebSocket.OPEN) return;
      const payload: Record<string, unknown> = { type: "interact" };
      if (detail?.kind === "loot") {
        payload.lootId = detail.lootId;
      } else if (detail?.kind === "npc") {
        payload.npcId = detail.npcId;
      }
      ws.send(JSON.stringify(payload));
    };
    boundWsHandlers = { core, onInput, onAttack, onInteract };
    core.events.on("input", onInput);
    core.events.on("attack", onAttack);
    core.events.on("interact", onInteract);
  };

  ws.onmessage = (msg) => {
    if (myGen !== wsConnectionGeneration || ws !== globalWs) return;
    try {
      const data = JSON.parse(msg.data);

      // Heartbeat: reset timeout on pong
      if (data.type === "pong") {
        if (heartbeatTimeout) { clearTimeout(heartbeatTimeout); heartbeatTimeout = null; }
        return;
      }
      if (data.type === "error") {
        const errorMessage = typeof data.message === "string" ? data.message : "Server error";
        const errCode = typeof data.code === "string" ? data.code : "";
        console.error("[WS] Server error:", errorMessage, errCode ? `(${errCode})` : "");
        emitNetStatus("error", errorMessage);
        const loginError = /login/i.test(errorMessage) || errCode === "invalid_token" || errCode === "login_required";
        const badToken =
          errCode === "invalid_token" ||
          /invalid or expired token/i.test(errorMessage);
        if (
          (loginError || badToken) &&
          !attemptedAnonymousFallback &&
          ws.readyState === WebSocket.OPEN
        ) {
          attemptedAnonymousFallback = true;
          try {
            localStorage.removeItem("token");
          } catch {
            // Ignore storage failures and still try fallback login.
          }
          emitNetStatus(
            "warning",
            badToken
              ? "Login token invalid or expired — retrying."
              : "Token rejected. Retrying login without token..."
          );
          sendLogin(undefined);
        }
        return;
      }
      if (data.type === 'entity_sync') {
        const nextAreMode =
          typeof data.recommendedAreMode === "string"
            ? data.recommendedAreMode
            : typeof data.areMode === "string"
              ? data.areMode
              : null;
        if (typeof nextAreMode === "string") {
          core.setAREMode(nextAreMode);
        }
        emitNetStatus("sync", "World synchronized.");
        if (data.entities) {
          const normalizedEntities = data.entities.map((entity: any) => ({
            ...entity,
            modelUrl: entity.modelUrl ?? entity.glbPath,
            are: normalizeAREPayload(entity.are),
          }));
          core.syncEntities(normalizedEntities);
          updateMinimapEntities(normalizedEntities);
          pushEntitySyncToGameHud(normalizedEntities);
        }
        if (data.chunks) core.syncChunks(data.chunks);
      }
      if (data.type === 'entity_action') {
        core.handleEntityAction(data.entityId, data.action);
      }
      if (data.type === 'welcome') {
        console.log(`Welcome to Areloria! Your ID: ${data.playerId}`);
        welcomeReceived = true;
        emitNetStatus("welcome", "Joined world.");
        const initialAreMode =
          typeof data.recommendedAreMode === "string"
            ? data.recommendedAreMode
            : typeof data.areMode === "string"
              ? data.areMode
              : null;
        if (typeof initialAreMode === "string") {
          core.setAREMode(initialAreMode);
        }
        const localPlayerId = data.playerId || data.id;
        if (
          typeof localPlayerId === "string" &&
          localPlayerId.startsWith("guest_") &&
          (!options.token || !String(options.token).trim())
        ) {
          try {
            localStorage.setItem(GUEST_STORAGE_KEY, localPlayerId);
          } catch {
            // ignore storage access issues
          }
        }
        core.setLocalPlayer(localPlayerId);
        setMinimapLocalPlayer(typeof localPlayerId === "string" ? localPlayerId : null);
        if (typeof localPlayerId === "string" && localPlayerId.length > 0) {
          try {
            window.dispatchEvent(
              new CustomEvent("areloria:local-player-id", { detail: { playerId: localPlayerId } })
            );
          } catch {
            /* ignore */
          }
        }
        pushGameHudConnected(true);
        if (data.stats && typeof data.stats === "object") {
          applyStatsPayload(data.stats);
          const cooldowns = data.stats.skillCooldownUntil && typeof data.stats.skillCooldownUntil === "object"
            ? data.stats.skillCooldownUntil
            : {};
          const impactUntil = Number(cooldowns[IMPACT_BUSTER_SKILL_ID] ?? 0);
          const left = impactUntil > Date.now() ? impactUntil - Date.now() : 0;
          setMobileImpactButtonState({
            unlocked: typeof data.stats.impactBusterUnlocked === "boolean"
              ? data.stats.impactBusterUnlocked
              : isImpactBusterUnlocked(),
            cooldownRemainingMs: left,
          });
        }
        window.setTimeout(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "quest_sync", questlineId: "mainline_awakening" }));
          }
        }, 0);
        const spawnPos = toEntityPosition(data.spawnPosition);
        if (spawnPos && localPlayerId) {
          core.syncEntities([
            {
              id: localPlayerId,
              type: "player",
              position: spawnPos,
              rotation: { x: 0, y: 0, z: 0 },
              visible: true,
            },
          ]);
        }
        if (data.sceneId || data.spawnKey || data.spawnPosition) {
          console.log("Spawn assigned:", {
            sceneId: data.sceneId,
            spawnKey: data.spawnKey,
            spawnPosition: data.spawnPosition,
          });
        }
        // Start the read-only overlay snapshot bridge so the 3D minimap
        // receives the same server-authoritative WorldOverlayModel as the 2D
        // client. The bridge degrades honestly if the endpoint is unavailable.
        const overlayBridge = getWorldOverlaySnapshotBridge();
        overlayBridge.subscribe((state) => {
          const markers: MinimapMarker[] = buildMinimapMarkersFromOverlay(state.model);
          updateMinimapOverlayMarkers(markers, overlayStatusLabel(state.model));
          getWorldSurfaceBabylonRenderer()?.apply(state.model);
        });
        overlayBridge.start();
      }
      if (data.type === "stats_sync") {
        applyStatsPayload(data);
        const cooldowns = data.skillCooldownUntil && typeof data.skillCooldownUntil === "object"
          ? data.skillCooldownUntil
          : {};
        const impactUntil = Number(cooldowns[IMPACT_BUSTER_SKILL_ID] ?? 0);
        const left = impactUntil > Date.now() ? impactUntil - Date.now() : 0;
        setMobileImpactButtonState({
          unlocked: typeof data.impactBusterUnlocked === "boolean"
            ? data.impactBusterUnlocked
            : isImpactBusterUnlocked(),
          cooldownRemainingMs: left,
        });
      }
      if (data.type === "questline_state") {
        applyQuestlineState(data);
      }
      if (data.type === "questline_features") {
        const unlocked = applyQuestlineFeatures(data);
        if (unlocked.length) {
          notifySuccess(unlocked.join(", "), { title: "Questline" });
        }
      }
      if (data.type === "chat_message") {
        const payload = data.payload && typeof data.payload === "object" ? data.payload : data;
        onChatMessage({
          senderName:
            typeof payload.senderName === "string"
              ? payload.senderName
              : typeof payload.sender === "string"
                ? payload.sender
                : "Unknown",
          text: typeof payload.text === "string" ? payload.text : "",
          scope:
            typeof payload.scope === "string"
              ? payload.scope
              : typeof payload.channel === "string"
                ? payload.channel
                : "global",
          channel: typeof payload.channel === "string" ? payload.channel : undefined,
          senderType: typeof payload.senderType === "string" ? payload.senderType : undefined,
          npcId: typeof payload.npcId === "string" ? payload.npcId : undefined,
          ts: Number(payload.ts),
          timestamp: Number(payload.timestamp),
        });
      }
      if (data.type === 'scene_changed') {
        // Track zone entry in PostHog
        if ((window as any).posthog) {
          (window as any).posthog.capture("zone_entered", {
            zone_id: data.sceneId,
            spawn_key: data.spawnKey,
          });
        }
        const localPlayerId = core.getLocalPlayerId();
        const spawnPos = toEntityPosition(data.spawnPosition);
        if (spawnPos && localPlayerId) {
          core.syncEntities([
            {
              id: localPlayerId,
              type: "player",
              position: spawnPos,
              rotation: { x: 0, y: 0, z: 0 },
              visible: true,
            },
          ]);
        }
        console.log("Scene changed:", {
          sceneId: data.sceneId,
          spawnKey: data.spawnKey,
          spawnPosition: data.spawnPosition,
        });
      }
      if (data.type === "toast") {
        const kind = typeof data.kind === "string" ? data.kind : "info";
        const text = typeof data.text === "string" ? data.text : "";
        const tone =
          kind === "err" ? "error" : kind === "ok" ? "success" : kind === "warn" ? "warn" : "info";
        showNotification(text, tone);
      }
      if (data.type === "fx") {
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        spawnFloatingNumber(cx + (Math.random() - 0.5) * 80, cy - 40, data.kind, data.n);
        pushProtocolMsgToGameHud(data);
      }
      if (data.type === "impact_buster_fx") {
        const at =
          data.at && typeof data.at === "object"
            ? {
                x: Number((data.at as Record<string, unknown>).x ?? 0),
                y: Number((data.at as Record<string, unknown>).y ?? 0),
              }
            : undefined;
        const radius = Number(data.radius ?? 5.5);
        triggerImpactLocalPulse(at, radius);
        pushProtocolMsgToGameHud(data);
      }
      if (data.type === "worldboss_entered") {
        notifySuccess("Worldboss Dungeon betreten.", { title: "Worldboss" });
        pushProtocolMsgToGameHud(data);
      }
      if (data.type === "worldboss_spawned" || data.type === "worldboss_defeated") {
        pushProtocolMsgToGameHud(data);
      }
      if (data.type === "worldboss_encounter_update" || data.type === "worldboss_ranking") {
        pushProtocolMsgToGameHud(data);
      }
      if (
        data.type === "vote_status" ||
        data.type === "vote_banners" ||
        data.type === "vote_session_opened" ||
        data.type === "vote_verify_result" ||
        data.type === "vote_claim_result"
      ) {
        pushProtocolMsgToGameHud(data);
      }
      if (
        data.type === "warfront_status" ||
        data.type === "warfront_frontboss_ready" ||
        data.type === "warfront_frontboss_spawned" ||
        data.type === "warfront_frontboss_defeated" ||
        data.type === "warfront_cycle_rotated"
      ) {
        pushProtocolMsgToGameHud(data);
      }
      if (data.type === "combat_result") {
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        const kind = data.crit ? "crit" : data.hit ? "hit" : "miss";
        spawnFloatingNumber(cx + (Math.random() - 0.5) * 60, cy - 60, kind, data.damage);
        pushProtocolMsgToGameHud(data);
      }
      if (data.type === "loot_spawned") {
        notifyWarn("Loot dropped nearby!", { title: "Beute" });
        if (data.loot) pushLootSpawnedToGameHud(data.loot);
      }
      if (data.type === "loot_despawned" && typeof data.lootId === "string") {
        pushLootDespawnedToGameHud(data.lootId);
      }
      if (data.type === "loot_picked") {
        const items = Array.isArray(data.items) ? data.items : [];
        for (const it of items) {
          if (it.name) notifySuccess(`+${it.qty}x ${it.name}`, { title: "Eingesammelt" });
        }
        if (typeof data.gold === "number" && data.gold > 0) {
          spawnFloatingNumber(window.innerWidth / 2, window.innerHeight / 2 - 30, "gold", data.gold);
        }
      }
      if (data.type === "player_died") {
        const ms = typeof data.respawnInMs === "number" ? data.respawnInMs : 8000;
        showDeathScreen(ms);
      }
      if (data.type === "player_respawned") {
        hideDeathScreen();
        const localPlayerId = core.getLocalPlayerId();
        if (localPlayerId && typeof data.x === "number" && typeof data.z === "number") {
          core.syncEntities([{
            id: localPlayerId,
            type: "player",
            position: { x: data.x, y: 0, z: data.z },
            rotation: { x: 0, y: 0, z: 0 },
            visible: true,
          }]);
        }
        if (typeof data.label === "string") {
          notifySuccess(`Respawned at ${data.label}`, { title: "Respawn" });
        }
      }
      if (data.type === "party_sync") {
        applyPartySync(data);
      }
      if (data.type === 'dialogue') {
        core.handleDialogue({
          source: data.source,
          text: data.text,
          questId: data.questId,
          choices: data.choices,
          npcId: data.npcId,
          nodeId: data.nodeId,
        });
      }
    } catch (e) {
      console.warn("Failed to parse server message:", msg.data);
    }
  };

  ws.onerror = () => {
    if (myGen !== wsConnectionGeneration) return;
    emitNetStatus("error", "Network error while connecting to /ws.");
  };

  ws.onclose = () => {
    if (myGen !== wsConnectionGeneration) return;
    stopHeartbeat();
    pushGameHudConnected(false);
    emitNetStatus("closed", "Disconnected from game server.");
    // Auto-reconnect unless this was a clean client disconnect
    if (reconnectTarget) {
      scheduleAutoReconnect(reconnectTarget.core, reconnectTarget.options);
    }
  };
}

export function sendDialogueChoice(npcId: string, choiceId: string, nodeId?: string) {
  if (globalWs && globalWs.readyState === WebSocket.OPEN) {
    globalWs.send(
      JSON.stringify({
        type: "dialogue_choice",
        npcId,
        choiceId,
        ...(nodeId ? { nodeId } : {}),
      })
    );
  }
}

export function sendQuestAccept(npcId: string, nodeId?: string) {
  if (globalWs && globalWs.readyState === WebSocket.OPEN) {
    globalWs.send(JSON.stringify({ type: "quest_accept", npcId, ...(nodeId ? { nodeId } : {}) }));
  }
}

export function requestQuestSync() {
  if (globalWs && globalWs.readyState === WebSocket.OPEN) {
    globalWs.send(JSON.stringify({ type: "quest_sync" }));
  }
}

export function sendChatMessage(text: string, channel: string = "global") {
  if (globalWs && globalWs.readyState === WebSocket.OPEN) {
    globalWs.send(JSON.stringify({ type: "chat_send", channel, text }));
  }
}

export function sendCommand(type: string, payload: any = {}) {
  if (globalWs && globalWs.readyState === WebSocket.OPEN) {
    globalWs.send(JSON.stringify({ type, ...payload }));
  }
}

export function requestSceneChange(sceneId: string, spawnKey?: string) {
  sendCommand("scene_change", { sceneId, spawnKey });
}

export function sendRespawn() {
  sendCommand("respawn", {});
}

export function sendPickupLoot(lootId: string) {
  sendCommand("pickup_loot", { lootId });
}

export function sendEquipGear(itemUid: string) {
  sendCommand("equip_gear", { itemUid });
}

export function sendQuestlineSync(questlineId = "mainline_awakening") {
  if (globalWs && globalWs.readyState === WebSocket.OPEN) {
    globalWs.send(JSON.stringify({ type: "quest_sync", questlineId }));
  }
}

export function sendEquipItem(itemId: string) {
  sendCommand("equip_item", { itemId });
}

export function sendUnequipItem(slot: "weapon" | "armor" | "offHand") {
  sendCommand("unequip_item", { slot });
}

export function sendSetCombatTarget(npcId: string | null) {
  sendCommand("set_target", { npcId: npcId ?? "" });
}

export function sendUseItem(itemId: string, count = 1) {
  sendCommand("use_item", { itemId, count });
}

export function sendSplitStack(rowIndex: number, amount: number) {
  sendCommand("split_stack", { rowIndex, amount });
}

export function sendUseSkill(skillId: string) {
  sendCommand("use_skill", { skillId });
}

export function requestVoteBanners() {
  sendCommand("vote_banners", {});
}

export function requestVoteStatus() {
  sendCommand("vote_status", {});
}

export function openVoteSession(bannerId: string) {
  sendCommand("vote_open", { bannerId });
}

export function verifyVoteSession(sessionId: string) {
  sendCommand("vote_verify", { sessionId });
}

export function claimVoteSession(sessionId: string) {
  sendCommand("vote_claim", { sessionId });
}

export function requestWarfrontStatus() {
  sendCommand("warfront_status", {});
}

export function claimWarfrontRewards() {
  sendCommand("warfront_claim_rewards", {});
}

export const sendMessage = sendCommand;
