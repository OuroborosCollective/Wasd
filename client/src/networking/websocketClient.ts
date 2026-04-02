import { MMORPGClientCore } from "../core/MMORPGClientCore";
import { applyStatsPayload } from "../state/playerState";
import { showToast } from "../ui/toast";
import { onEntitySyncForCombatUi, setCombatUiLocalPlayerId } from "../ui/combatMobileUi";

let globalWs: WebSocket | null = null;
const DEFAULT_SCENE_ID = "didis_hub";
const DEFAULT_SPAWN_KEY = "sp_player_default";

const GUEST_STORAGE_KEY = "areloria_guest_id";

export type ConnectionOptions = {
  token?: string;
  sceneId?: string;
  spawnKey?: string;
};

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

export function connectSocket(core: MMORPGClientCore, options: ConnectionOptions = {}) {
  const ws = new WebSocket(resolveWebSocketUrl());
  globalWs = ws;

  ws.onopen = () => {
    console.log("Connected to Arelorian Server");
    const loginPayload: Record<string, unknown> = {
      type: "login",
      token: options.token,
      sceneId: resolveInitialSceneId(options.sceneId),
      spawnKey: resolveInitialSpawnKey(options.spawnKey),
    };
    if (!options.token || !String(options.token).trim()) {
      const stored = localStorage.getItem(GUEST_STORAGE_KEY);
      if (stored && /^guest_[a-zA-Z0-9_-]{8,40}$/.test(stored)) {
        loginPayload.guestId = stored;
      }
    }
    ws.send(JSON.stringify(loginPayload));

    core.events.on('input', (input: any) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'input', input }));
      }
    });

    core.events.on("move_intent", (payload: { dx: number; dy: number }) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "move_intent", dx: payload.dx, dy: payload.dy }));
      }
    });

    core.events.on('attack', () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'attack' }));
      }
    });

    core.events.on('interact', () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'interact' }));
      }
    });
  };

  ws.onmessage = (msg) => {
    try {
      const data = JSON.parse(msg.data);
      if (data.type === 'entity_sync') {
        if (typeof data.areMode === "string") {
          core.setAREMode(data.areMode);
        }
        if (data.entities) {
          const normalizedEntities = data.entities.map((entity: any) => ({
            ...entity,
            modelUrl: entity.modelUrl ?? entity.glbPath,
            are: normalizeAREPayload(entity.are),
            lootKind: entity.lootKind === "gold" || entity.lootKind === "item" ? entity.lootKind : undefined,
            goldAmount: typeof entity.goldAmount === "number" ? entity.goldAmount : undefined,
            health: typeof entity.health === "number" ? entity.health : undefined,
            maxHealth: typeof entity.maxHealth === "number" ? entity.maxHealth : undefined,
            combatThreat: entity.combatThreat === true,
            combatNpcId:
              typeof entity.combatNpcId === "string"
                ? entity.combatNpcId
                : entity.type === "npc" && typeof entity.id === "string"
                  ? entity.id
                  : undefined,
          }));
          core.syncEntities(normalizedEntities);
          onEntitySyncForCombatUi(normalizedEntities);
        }
        if (data.chunks) core.syncChunks(data.chunks);
      }
      if (data.type === 'entity_action') {
        core.handleEntityAction(data.entityId, data.action);
      }
      if (data.type === "welcome") {
        console.log(`Welcome to Areloria! Your ID: ${data.playerId}`);
        const localPlayerId = data.playerId || data.id;
        if (
          typeof localPlayerId === "string" &&
          localPlayerId.startsWith("guest_") &&
          (!options.token || !String(options.token).trim())
        ) {
          localStorage.setItem(GUEST_STORAGE_KEY, localPlayerId);
        }
        core.setLocalPlayer(localPlayerId);
        setCombatUiLocalPlayerId(localPlayerId);
        if (data.stats && typeof data.stats === "object") {
          applyStatsPayload(data.stats as any);
        }
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
      if (data.type === "dialogue") {
        core.handleDialogue({
          source: data.source,
          text: data.text,
          questId: data.questId,
          choices: data.choices,
          npcId: data.npcId,
          nodeId: data.nodeId,
        });
      }
      if (data.type === "stats_sync") {
        applyStatsPayload(data as any);
      }
      if (data.type === "toast" && typeof data.text === "string") {
        showToast(data.text);
      }
    } catch (e) {
      console.warn("Failed to parse server message:", msg.data);
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

export function sendUseItem(itemId: string) {
  sendCommand("use_item", { itemId });
}

export const sendMessage = sendCommand;
