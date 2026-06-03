import type { AreloriaBootConfig } from "../boot/boot.config";
import type {
  ClientHelloPayload,
  GuestLoginPayload,
  InputFrame,
  ServerEnvelope,
  SkillCastPayload,
  WorldSnapshot
} from "./protocol";
import {
  createClientEnvelope,
  isRecord,
  isWorldSnapshot
} from "./protocol";

export interface NetworkEvents {
  onWelcome?: (payload: { playerId: string; sceneId?: string; serverTick?: number }) => void;
  onWorldSnapshot?: (snapshot: WorldSnapshot) => void;
  onToast?: (payload: { message: string; severity?: string }) => void;
  onStatusChange?: (status: NetworkStatus) => void;
}

export type NetworkStatus = "idle" | "connecting" | "connected" | "disconnected";

export interface NetworkClient {
  connect(): void;
  close(): void;
  sendInputFrame(frame: InputFrame): void;
  sendSkillCast(payload: SkillCastPayload): void;
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
      send("client_heartbeat", {
        client: config.clientId
      });
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

    if (envelope.type === "welcome" && isRecord(envelope.payload)) {
      const playerId = envelope.payload.playerId;

      if (typeof playerId === "string") {
        events.onWelcome?.({
          playerId,
          sceneId:
            typeof envelope.payload.sceneId === "string"
              ? envelope.payload.sceneId
              : undefined,
          serverTick:
            typeof envelope.payload.serverTick === "number"
              ? envelope.payload.serverTick
              : undefined
        });
      }

      return;
    }

    if (envelope.type === "world_snapshot" && isWorldSnapshot(envelope.payload)) {
      events.onWorldSnapshot?.({
        ...envelope.payload,
        receivedAtMs: performance.now()
      });
      return;
    }

    if (envelope.type === "toast" && isRecord(envelope.payload)) {
      events.onToast?.({
        message:
          typeof envelope.payload.message === "string"
            ? envelope.payload.message
            : "Server message",
        severity:
          typeof envelope.payload.severity === "string"
            ? envelope.payload.severity
            : "info"
      });
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
        version: "phase-2"
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

    getStatus() {
      return status;
    }
  };
}