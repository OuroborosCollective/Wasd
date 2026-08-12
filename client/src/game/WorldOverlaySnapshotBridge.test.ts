import { describe, expect, it } from "vitest";
import { deriveOverlayFromApiResponse, WorldOverlaySnapshotBridge } from "./WorldOverlaySnapshotBridge";

function makeFetchReturning(body: unknown, ok = true, status = 200): typeof fetch {
  return (async () =>
    ({
      ok,
      status,
      json: async () => body,
    }) as Response) as typeof fetch;
}

function makeFetchThrowing(message: string): typeof fetch {
  return (async () => {
    throw new Error(message);
  }) as typeof fetch;
}

describe("WorldOverlaySnapshotBridge", () => {
  it("derives live model from a valid response", async () => {
    const body = {
      ok: true,
      serverTick: 42,
      revisionHash: "abc",
      liveGameplaySnapshot: {
        status: "live",
        serverTick: 42,
        worldSurface: { tick: 7, groups: [{ id: "g1", title: "House" }], points: [{ id: "p1", x: 1, y: 2 }] },
        worldPois: [{ poiId: "poi_1", type: "village", title: "V", x: 1, y: 2, chunkX: 0, chunkZ: 0, discovered: true }],
      },
    };
    const bridge = new WorldOverlaySnapshotBridge({ fetchImpl: makeFetchReturning(body) });
    const state = await bridge.refresh();
    expect(state.model.status).toBe("live");
    expect(state.serverTick).toBe(42);
    expect(state.revisionHash).toBe("abc");
    expect(state.lastError).toBeNull();
  });

  it("reports blocked when ok=false", async () => {
    const body = { ok: false, error: "snapshot_source_unavailable" };
    const bridge = new WorldOverlaySnapshotBridge({ fetchImpl: makeFetchReturning(body, false, 503) });
    const state = await bridge.refresh();
    expect(state.model.status).toBe("blocked");
    expect(state.lastError).toBe("http_503");
  });

  it("reports waiting when ok=true but no snapshot payload", async () => {
    const body = { ok: true, serverTick: 1 };
    const bridge = new WorldOverlaySnapshotBridge({ fetchImpl: makeFetchReturning(body) });
    const state = await bridge.refresh();
    expect(state.model.status).toBe("waiting");
  });

  it("reports blocked on fetch throw", async () => {
    const bridge = new WorldOverlaySnapshotBridge({ fetchImpl: makeFetchThrowing("network_error") });
    const state = await bridge.refresh();
    expect(state.model.status).toBe("blocked");
    expect(state.lastError).toBe("network_error");
  });

  it("notifies subscribers on state change", async () => {
    const body = {
      ok: true,
      serverTick: 5,
      liveGameplaySnapshot: { status: "live", worldSurface: { tick: 1, groups: [], points: [] } },
    };
    const bridge = new WorldOverlaySnapshotBridge({ fetchImpl: makeFetchReturning(body) });
    const states: string[] = [];
    bridge.subscribe((s) => states.push(s.model.status));
    await bridge.refresh();
    expect(states).toContain("live");
  });
});

describe("deriveOverlayFromApiResponse", () => {
  it("returns empty model for non-record body", () => {
    expect(deriveOverlayFromApiResponse("garbage").status).toBe("waiting");
  });

  it("returns blocked for ok=false", () => {
    expect(deriveOverlayFromApiResponse({ ok: false }).status).toBe("blocked");
  });
});
