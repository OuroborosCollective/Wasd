import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../state/playerState", () => ({
  applyStatsPayload: vi.fn(),
}));

vi.mock("../ui/gameplayToast", () => ({
  showGameplayToast: vi.fn(),
}));

import { connectSocket } from "../networking/websocketClient";
import { applyStatsPayload } from "../state/playerState";
import { showGameplayToast } from "../ui/gameplayToast";

class FakeEventBus {
  private listeners = new Map<string, Function[]>();

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function) {
    const current = this.listeners.get(event) ?? [];
    this.listeners.set(
      event,
      current.filter((fn) => fn !== callback)
    );
  }

  emit(event: string, ...args: any[]) {
    const current = this.listeners.get(event) ?? [];
    for (const callback of current) {
      callback(...args);
    }
  }
}

class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  static instances: MockWebSocket[] = [];

  readyState = MockWebSocket.CONNECTING;
  onopen: ((this: WebSocket, ev: Event) => any) | null = null;
  onmessage: ((this: WebSocket, ev: MessageEvent) => any) | null = null;
  onerror: ((this: WebSocket, ev: Event) => any) | null = null;
  onclose: ((this: WebSocket, ev: CloseEvent) => any) | null = null;
  sent: string[] = [];

  constructor(public url: string) {
    MockWebSocket.instances.push(this);
  }

  send(data: string) {
    this.sent.push(data);
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.call(this as unknown as WebSocket, {} as CloseEvent);
  }

  triggerOpen() {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.call(this as unknown as WebSocket, {} as Event);
  }

  triggerMessage(payload: unknown) {
    this.onmessage?.call(this as unknown as WebSocket, {
      data: JSON.stringify(payload),
    } as MessageEvent);
  }
}

function createFakeCore() {
  return {
    events: new FakeEventBus(),
    setAREPolicyConfig: vi.fn(),
    setAREMode: vi.fn(),
    syncEntities: vi.fn(),
    syncChunks: vi.fn(),
    handleEntityAction: vi.fn(),
    setLocalPlayer: vi.fn(),
    getLocalPlayerId: vi.fn(() => "player_test"),
    handleDialogue: vi.fn(),
  };
}

beforeEach(() => {
  MockWebSocket.instances.length = 0;
  vi.clearAllMocks();

  vi.stubGlobal("WebSocket", MockWebSocket as unknown as typeof WebSocket);
  vi.stubGlobal("location", {
    protocol: "http:",
    host: "localhost:3000",
    search: "",
  });
  vi.stubGlobal("navigator", { userAgent: "Vitest" });
  vi.stubGlobal("CustomEvent", class<T = unknown> {
    type: string;
    detail: T;
    constructor(type: string, init?: { detail?: T }) {
      this.type = type;
      this.detail = init?.detail as T;
    }
  });
  vi.stubGlobal("window", {
    setTimeout: vi.fn(() => 0),
    dispatchEvent: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    matchMedia: vi.fn(() => ({ matches: false })),
    innerWidth: 1280,
  });
});

describe("websocketClient", () => {
  it("forwards move_intent and use_skill core events over WebSocket", async () => {
    const core = createFakeCore();
    connectSocket(core as any, {});
    const ws = MockWebSocket.instances[0];
    ws.triggerOpen();
    await Promise.resolve();

    core.events.emit("move_intent", { dx: 0.4, dy: -0.2 });
    core.events.emit("use_skill", { skillId: "arc_spark" });

    const sent = ws.sent.map((raw) => JSON.parse(raw));
    expect(sent.some((msg) => msg.type === "move_intent" && msg.dx === 0.4 && msg.dy === -0.2)).toBe(true);
    expect(sent.some((msg) => msg.type === "use_skill" && msg.skillId === "arc_spark")).toBe(true);
  });

  it("applies welcome/stats sync and surfaces server toasts", async () => {
    const core = createFakeCore();
    connectSocket(core as any, {});
    const ws = MockWebSocket.instances[0];
    ws.triggerOpen();
    await Promise.resolve();

    ws.triggerMessage({
      type: "welcome",
      playerId: "player_test",
      stats: { gold: 12, xp: 3, dead: false },
      spawnPosition: { x: 1, y: 2, z: 3 },
    });
    ws.triggerMessage({ type: "stats_sync", gold: 44, dead: true });
    ws.triggerMessage({
      type: "entity_sync",
      entities: [
        {
          id: "player_test",
          type: "player",
          position: { x: 1, y: 0, z: 2 },
          rotation: { x: 0, y: 0, z: 0 },
          glbPath: "/assets/models/player.glb",
        },
      ],
      chunks: [],
    });
    ws.triggerMessage({ type: "toast", text: "Not enough mana." });

    expect(core.setLocalPlayer).toHaveBeenCalledWith("player_test");
    expect(vi.mocked(applyStatsPayload)).toHaveBeenCalledWith(expect.objectContaining({ gold: 12, xp: 3 }));
    expect(vi.mocked(applyStatsPayload)).toHaveBeenCalledWith(expect.objectContaining({ gold: 44, dead: true }));
    expect(core.syncEntities).toHaveBeenCalledWith([
      expect.objectContaining({ id: "player_test", modelUrl: "/assets/models/player.glb" }),
    ]);
    expect(vi.mocked(showGameplayToast)).toHaveBeenCalledWith("Not enough mana.");

    const dispatchedTypes = (window.dispatchEvent as any).mock.calls.map((call: any[]) => call[0]?.type);
    expect(dispatchedTypes).toContain("areloria:local-player");
    expect(dispatchedTypes).toContain("areloria:entity-sync");
    expect(dispatchedTypes).toContain("areloria:toast");
  });
});
