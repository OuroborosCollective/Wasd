import { MMORPGClientCore } from "../core/MMORPGClientCore";

let globalWs: WebSocket | null = null;
const DEFAULT_SCENE_ID = "didis_hub";
const DEFAULT_SPAWN_KEY = "sp_player_default";
const GUEST_STORAGE_KEY = "areloria_guest_id";
let authTokenProvider: (() => Promise<string | null>) | null = null;

/** Last connectSocket target so we can reconnect after Google login refreshes the JWT. */
let reconnectTarget: { core: MMORPGClientCore; options: ConnectionOptions } | null = null;

type BoundWsHandlers = {
  core: MMORPGClientCore;
  onInput: (input: any) => void;
  onAttack: () => void;
  onInteract: () => void;
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

  const sendLogin = (token?: string, guestId?: string) => {
    if (ws.readyState !== WebSocket.OPEN) return;
    ws.send(
      JSON.stringify({
        type: "login",
        token,
        ...(guestId ? { guestId } : {}),
        sceneId,
        spawnKey,
      })
    );
    emitNetStatus("login_sent", token ? "Authenticating..." : "Joining world (guest fallback)...");
  };

  ws.onopen = async () => {
    if (myGen !== wsConnectionGeneration || ws !== globalWs) return;
    console.log("Connected to Arelorian Server");
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
    sendLogin(token, guestId);

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
    const onInteract = () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "interact" }));
      }
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
      if (data.type === "error") {
        const errorMessage = typeof data.message === "string" ? data.message : "Server error";
        const errCode = typeof data.code === "string" ? data.code : "";
        console.error("[WS] Server error:", errorMessage, errCode ? `(${errCode})` : "");
        emitNetStatus("error", errorMessage);
        const loginError = /login/i.test(errorMessage) || errCode === "invalid_token" || errCode === "login_required";
        const badFirebaseToken =
          errCode === "invalid_token" ||
          /invalid or expired token/i.test(errorMessage) ||
          /firebase sign-in required/i.test(errorMessage);
        if (
          (loginError || badFirebaseToken) &&
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
            badFirebaseToken
              ? "Anmelde-Token ungültig oder abgelaufen — neuer Versuch (bitte ggf. erneut bei Google anmelden)."
              : "Token rejected. Retrying login without token..."
          );
          sendLogin(undefined);
        }
        return;
      }
      if (data.type === 'entity_sync') {
        if (typeof data.areMode === "string") {
          core.setAREMode(data.areMode);
        }
        emitNetStatus("sync", "World synchronized.");
        if (data.entities) {
          const normalizedEntities = data.entities.map((entity: any) => ({
            ...entity,
            modelUrl: entity.modelUrl ?? entity.glbPath,
            are: normalizeAREPayload(entity.are),
          }));
          core.syncEntities(normalizedEntities);
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
      }
      if (data.type === 'scene_changed') {
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
    emitNetStatus("closed", "Disconnected from game server.");
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

export function sendChatMessage(text: string) {
  if (globalWs && globalWs.readyState === WebSocket.OPEN) {
    globalWs.send(JSON.stringify({ type: 'chat_message', text }));
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

export function sendEquipItem(itemId: string) {
  sendCommand("equip_item", { itemId });
}

export function sendUnequipItem(slot: "weapon" | "armor") {
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

export const sendMessage = sendCommand;
