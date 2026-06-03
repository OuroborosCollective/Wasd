import type { AreloriaBootConfig } from "../boot/boot.config";
import type {
  ChatMessagePayload,
  ChatSendPayload,
  ClientHeartbeatPayload,
  ClientHelloPayload,
  CombatResultPayload,
  GuestLoginPayload,
  InputFrame,
  InventorySnapshotPayload,
  EquipmentSnapshotPayload,
  QuestSnapshotPayload,
  LootPickupResultPayload,
  NpcDialoguePayload,
  ChunkObservePayload,
  SkillResultPayload,
  ServerEnvelope,
  SkillCastPayload,
  ToastPayload,
  WelcomePayload,
  WorldSnapshot
} from "./protocol";
import {
  ARELORIA_PROTOCOL_VERSION,
  createClientEnvelope,
  isChatMessagePayload,
  isCombatResultPayload,
  isInventorySnapshotPayload,
  isEquipmentSnapshotPayload,
  isQuestSnapshotPayload,
  isLootPickupResultPayload,
  isNpcDialoguePayload,
  isChunkObservePayload,
  isSkillResultPayload,
  isRecord,
  isServerHeartbeatPayload,
  isToastPayload,
  isWelcomePayload,
  isWorldSnapshot
} from "./protocol";

export type NetworkStatus = "idle" | "connecting" | "connected" | "disconnected";

export interface NetworkEvents {
  onWelcome?: (payload: WelcomePayload) => void;
  onWorldSnapshot?: (snapshot: WorldSnapshot) => void;
  onToast?: (payload: ToastPayload) => void;
  onChatMessage?: (payload: ChatMessagePayload) => void;
  onCombatResult?: (payload: CombatResultPayload) => void;
  onServerHeartbeat?: (payload: { serverTimeMs: number; serverTick?: number; clientSentAtMs?: number }) => void;
  onStatusChange?: (status: NetworkStatus) => void;
  // Phase 4 Events
  onInventorySnapshot?: (payload: InventorySnapshotPayload) => void;
  onEquipmentSnapshot?: (payload: EquipmentSnapshotPayload) => void;
  onQuestSnapshot?: (payload: QuestSnapshotPayload) => void;
  onLootPickupResult?: (payload: LootPickupResultPayload) => void;
  onNpcDialogue?: (payload: NpcDialoguePayload) => void;
  onChunkObserve?: (payload: ChunkObservePayload) => void;
  onSkillResult?: (payload: SkillResultPayload) => void;
}

export interface NetworkClient {
  connect(): void;
  close(): void;
  sendInputFrame(frame: InputFrame): void;
  sendSkillCast(payload: SkillCastPayload): void;
  sendChat(text: string): void;
  // Phase 4 Send Methods
  sendLootPickupRequest(payload: { tickId: number; sequenceId: number; entityId: string }): void;
  sendNpcInteractRequest(payload: { tickId: number; sequenceId: number; npcId: string }): void;
  sendChunkObserve(payload: ChunkObservePayload): void;
  sendQuestTrack(questId: string): void;
  sendQuestAccept(questId: string): void;
  sendInventoryAction(payload: { action: string; itemId?: string; slot?: number }): void;
  sendEquipmentAction(payload: { action: string; slot?: string; itemId?: string }): void;
  getStatus(): NetworkStatus;
}

export function createNetworkClient(
  config: AreloriaBootConfig,
  events: NetworkEvents
): NetworkClient {
  let ws: WebSocket | null = null;
  let status: NetworkStatus = "idle";
  let closedByUser = false;
  let reconnectAttempt = 0;
  let heartbeatTimer: ReturnType<typeof setInterval> | undefined;
  let lastServerTick = 0;

  function setStatus(next: NetworkStatus): void {
    status = next;
    document.body.dataset.areloriaNetwork = next;
    events.onStatusChange?.(next);
  }

  function send(type: string, payload: unknown): void {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify(createClientEnvelope(type as never, payload)));
  }

  function stopHeartbeat(): void {
    if (heartbeatTimer !== undefined) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = undefined;
    }
  }

  function startHeartbeat(): void {
    stopHeartbeat();

    heartbeatTimer = setInterval(() => {
      const clientTimeMs = Date.now();

      const payload: ClientHeartbeatPayload = {
        clientTimeMs,
        lastServerTick
      };

      send("client_heartbeat", payload);
    }, config.network.heartbeatMs);
  }

  function handleMessage(raw: string): void {
    let envelope: ServerEnvelope<unknown, unknown>;

    try {
      envelope = JSON.parse(raw);
    } catch {
      console.warn("[Areloria Network] Invalid JSON", raw);
      return;
    }

    if (!isRecord(envelope) || typeof envelope.type !== "string") {
      return;
    }

    if (
      typeof envelope.protocolVersion === "number" &&
      envelope.protocolVersion > ARELORIA_PROTOCOL_VERSION
    ) {
      console.warn("[Areloria Network] Future protocol ignored", envelope);
      return;
    }

    if (envelope.type === "welcome" && isWelcomePayload(envelope.payload)) {
      lastServerTick = envelope.payload.serverTick ?? lastServerTick;
      events.onWelcome?.(envelope.payload);
      return;
    }

    if (envelope.type === "world_snapshot" && isWorldSnapshot(envelope.payload)) {
      lastServerTick = envelope.payload.serverTick;

      events.onWorldSnapshot?.({
        ...envelope.payload,
        protocolVersion: envelope.payload.protocolVersion || ARELORIA_PROTOCOL_VERSION,
        receivedAtMs: performance.now()
      });

      return;
    }

    if (envelope.type === "combat_result" && isCombatResultPayload(envelope.payload)) {
      events.onCombatResult?.(envelope.payload);
      return;
    }

    if (envelope.type === "toast" && isToastPayload(envelope.payload)) {
      events.onToast?.(envelope.payload);
      return;
    }

    if (envelope.type === "chat_message" && isChatMessagePayload(envelope.payload)) {
      events.onChatMessage?.(envelope.payload);
      return;
    }

    if (
      envelope.type === "server_heartbeat" &&
      isServerHeartbeatPayload(envelope.payload)
    ) {
      events.onServerHeartbeat?.({
        ...envelope.payload,
        clientSentAtMs:
          isRecord(envelope.payload) &&
          typeof envelope.payload.clientSentAtMs === "number"
            ? envelope.payload.clientSentAtMs
            : undefined
      });
    }

    // Phase 4 Message Handlers
    if (envelope.type === "inventory_snapshot" && isInventorySnapshotPayload(envelope.payload)) {
      events.onInventorySnapshot?.(envelope.payload);
      return;
    }

    if (envelope.type === "equipment_snapshot" && isEquipmentSnapshotPayload(envelope.payload)) {
      events.onEquipmentSnapshot?.(envelope.payload);
      return;
    }

    if (envelope.type === "quest_snapshot" && isQuestSnapshotPayload(envelope.payload)) {
      events.onQuestSnapshot?.(envelope.payload);
      return;
    }

    if (envelope.type === "loot_pickup_result" && isLootPickupResultPayload(envelope.payload)) {
      events.onLootPickupResult?.(envelope.payload);
      return;
    }

    if (envelope.type === "npc_dialogue" && isNpcDialoguePayload(envelope.payload)) {
      events.onNpcDialogue?.(envelope.payload);
      return;
    }

    if (envelope.type === "chunk_snapshot" && isRecord(envelope.payload)) {
      // chunk_snapshot is optional, just pass through
      return;
    }

    if (envelope.type === "skill_result" && isSkillResultPayload(envelope.payload)) {
      events.onSkillResult?.(envelope.payload);
      return;
    }
  }

  function scheduleReconnect(connectFn: () => void): void {
    if (closedByUser) return;

    const delay = Math.min(
      config.network.reconnectMaxMs,
      config.network.reconnectMinMs * Math.pow(1.6, reconnectAttempt)
    );

    reconnectAttempt += 1;

    setTimeout(() => {
      if (!closedByUser) connectFn();
    }, delay);
  }

  function connect(): void {
    if (ws && ws.readyState === WebSocket.OPEN) return;

    setStatus("connecting");

    try {
      ws = new WebSocket(config.network.wsUrl);
    } catch (error) {
      console.warn("[Areloria Network] WebSocket creation failed", error);
      setStatus("disconnected");
      scheduleReconnect(connect);
      return;
    }

    ws.addEventListener("open", () => {
      reconnectAttempt = 0;
      setStatus("connected");
      startHeartbeat();

      const hello: ClientHelloPayload = {
        client: config.clientId,
        engine: config.engine,
        logicHz: config.logicHz,
        version: "phase-3",
        protocolVersion: ARELORIA_PROTOCOL_VERSION
      };

      const login: GuestLoginPayload = {
        displayName: "Guest"
      };

      send("client_hello", hello);
      send("guest_login", login);
    });

    ws.addEventListener("message", (event) => {
      handleMessage(String(event.data));
    });

    ws.addEventListener("close", () => {
      stopHeartbeat();
      setStatus("disconnected");
      scheduleReconnect(connect);
    });

    ws.addEventListener("error", () => {
      console.warn("[Areloria Network] WebSocket error");
    });
  }

  return {
    connect,

    close() {
      closedByUser = true;
      stopHeartbeat();
      ws?.close();
      ws = null;
      setStatus("idle");
    },

    sendInputFrame(frame) {
      send("input_frame", frame);
    },

    sendSkillCast(payload) {
      send("skill_cast", payload);
    },

    sendChat(text) {
      const payload: ChatSendPayload = {
        text: text.trim().slice(0, 240)
      };

      if (payload.text.length > 0) {
        send("chat_send", payload);
      }
    },

    // Phase 4 Send Methods
    sendLootPickupRequest(payload) {
      send("loot_pickup_request", payload);
    },

    sendNpcInteractRequest(payload) {
      send("npc_interact_request", payload);
    },

    sendChunkObserve(payload) {
      send("chunk_observe", payload);
    },

    sendQuestTrack(questId) {
      send("quest_track", { questId });
    },

    sendQuestAccept(questId) {
      send("quest_accept", { questId });
    },

    sendInventoryAction(payload) {
      send("inventory_action", payload);
    },

    sendEquipmentAction(payload) {
      send("equipment_action", payload);
    },

    getStatus() {
      return status;
    }
  };
}