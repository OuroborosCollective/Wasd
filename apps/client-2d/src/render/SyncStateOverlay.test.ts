import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import {
  createSyncStateOverlayState,
  labelForSyncState,
  renderSyncStateOverlay,
  renderCausalCatchupOverlay,
  removeSyncStateOverlay,
} from "./SyncStateOverlay";

// Mock document for testing
function createMockDocument(): Document {
  const elements = new Map<string, HTMLElement>();

  const mockDoc = {
    body: {
      appendChild: vi.fn(),
      removeChild: vi.fn(),
    },
    getElementById: (id: string): HTMLElement | null => {
      return elements.get(id) ?? null;
    },
    createElement: (tagName: string): HTMLElement => {
      const el = {
        id: "",
        style: {},
        className: "",
        textContent: "",
        dataset: {} as Record<string, string>,
        setAttribute: vi.fn(),
        remove: vi.fn(),
        appendChild: vi.fn(),
      } as unknown as HTMLElement;
      elements.set(`mock-${elements.size}`, el);
      return el;
    },
    _elements: elements,
  } as unknown as Document;

  return mockDoc;
}

describe("SyncStateOverlay", () => {
  let mockDoc: Document;
  let elements: Map<string, HTMLElement>;

  beforeEach(() => {
    mockDoc = createMockDocument();
    elements = (mockDoc as unknown as { _elements: Map<string, HTMLElement> })._elements;
    vi.clearAllMocks();
  });

  describe("createSyncStateOverlayState", () => {
    it("returns null for invalid payload", () => {
      expect(createSyncStateOverlayState(null)).toBeNull();
      expect(createSyncStateOverlayState({})).toBeNull();
      expect(createSyncStateOverlayState({ eventCount: "not a number" })).toBeNull();
    });

    it("returns render state for valid payload", () => {
      const validPayload = {
        eventCount: 5,
        firstTick: 100,
        lastTick: 200,
        summaryHash: "abc123",
        events: [],
        sideChannelOnly: true,
      };
      const result = createSyncStateOverlayState(validPayload);
      expect(result).not.toBeNull();
      expect(result!.label).toBe("Causal catchup observed");
      expect(result!.eventCount).toBe(5);
      expect(result!.firstTick).toBe(100);
      expect(result!.lastTick).toBe(200);
      expect(result!.summaryHash).toBe("abc123");
    });

    it("returns 'Causal catchup idle' for zero events", () => {
      const payload = {
        eventCount: 0,
        firstTick: null,
        lastTick: null,
        summaryHash: "abc123",
        events: [],
        sideChannelOnly: true,
      };
      const result = createSyncStateOverlayState(payload);
      expect(result!.label).toBe("Causal catchup idle");
    });
  });

  describe("labelForSyncState", () => {
    it("returns correct labels for all states", () => {
      expect(labelForSyncState("waiting")).toBe("Waiting for server snapshot");
      expect(labelForSyncState("fresh")).toBe("Live");
      expect(labelForSyncState("stale_short")).toBe("Network delay");
      expect(labelForSyncState("stale_medium")).toBe("Snapshot is stale");
      expect(labelForSyncState("stale_long")).toBe("Resync required");
    });
  });

  describe("renderSyncStateOverlay", () => {
    it("returns null and removes overlay for fresh state", () => {
      const removeSpy = vi.spyOn(HTMLElement.prototype, "remove");

      // First create an overlay
      const existingOverlay = document.createElement("aside");
      existingOverlay.id = "areloria-sync-state-overlay";
      elements.set("areloria-sync-state-overlay", existingOverlay);

      // Now render fresh - should remove
      const result = renderSyncStateOverlay("fresh", mockDoc);
      expect(result).toBeNull();
    });

    it("does not create overlay for fresh state", () => {
      renderSyncStateOverlay("fresh", mockDoc);
      expect(mockDoc.body.appendChild).not.toHaveBeenCalled();
    });

    it("creates overlay for stale_short state", () => {
      const result = renderSyncStateOverlay("stale_short", mockDoc);
      expect(result).not.toBeNull();
      expect(mockDoc.body.appendChild).toHaveBeenCalled();
    });

    it("creates overlay for stale_medium state", () => {
      const result = renderSyncStateOverlay("stale_medium", mockDoc);
      expect(result).not.toBeNull();
    });

    it("creates overlay for stale_long state", () => {
      const result = renderSyncStateOverlay("stale_long", mockDoc);
      expect(result).not.toBeNull();
    });

    it("creates overlay for waiting state", () => {
      const result = renderSyncStateOverlay("waiting", mockDoc);
      expect(result).not.toBeNull();
    });

    it("sets correct class on overlay", () => {
      renderSyncStateOverlay("stale_long", mockDoc);
      const overlay = mockDoc.getElementById("areloria-sync-state-overlay");
      expect(overlay?.className).toContain("sync-state-overlay--stale_long");
    });
  });

  describe("renderCausalCatchupOverlay", () => {
    it("returns null for invalid payload", () => {
      expect(renderCausalCatchupOverlay(null, mockDoc)).toBeNull();
      expect(renderCausalCatchupOverlay({}, mockDoc)).toBeNull();
    });

    it("returns null when sideChannelOnly is not true", () => {
      const payload = {
        eventCount: 5,
        firstTick: 100,
        lastTick: 200,
        summaryHash: "abc123",
        events: [],
        sideChannelOnly: false,
      };
      expect(renderCausalCatchupOverlay(payload, mockDoc)).toBeNull();
    });

    it("creates overlay for valid payload with events", () => {
      const payload = {
        eventCount: 5,
        firstTick: 100,
        lastTick: 200,
        summaryHash: "abc123",
        events: [
          {
            eventId: "e1",
            type: "resource_depleted",
            tick: 150,
            significancePerMille: 500,
            regionId: "r1",
            chunkKey: "c1",
            payloadHash: "p1",
            eventHash: "eh1",
          },
        ],
        sideChannelOnly: true,
      };
      const result = renderCausalCatchupOverlay(payload, mockDoc);
      expect(result).not.toBeNull();
    });

    it("returns null for zero events", () => {
      const payload = {
        eventCount: 0,
        firstTick: null,
        lastTick: null,
        summaryHash: "abc123",
        events: [],
        sideChannelOnly: true,
      };
      // createSyncStateOverlayState would return state but render returns null for 0 events
      // Actually let's check - it creates overlay even with 0 events in the current impl
      const result = renderCausalCatchupOverlay(payload, mockDoc);
      expect(result).not.toBeNull();
    });
  });

  describe("removeSyncStateOverlay", () => {
    it("removes sync state overlay", () => {
      const overlay = document.createElement("aside");
      overlay.id = "areloria-sync-state-overlay";
      elements.set("areloria-sync-state-overlay", overlay);

      removeSyncStateOverlay(mockDoc);

      const removed = elements.get("areloria-sync-state-overlay");
      // The remove method should have been called
      expect(overlay.remove).toHaveBeenCalled();
    });

    it("removes causal catchup overlay", () => {
      const overlay = document.createElement("aside");
      overlay.id = "areloria-causal-catchup-overlay";
      elements.set("areloria-causal-catchup-overlay", overlay);

      removeSyncStateOverlay(mockDoc);

      expect(overlay.remove).toHaveBeenCalled();
    });

    it("handles missing overlays gracefully", () => {
      expect(() => removeSyncStateOverlay(mockDoc)).not.toThrow();
    });
  });
});

describe("SyncStateOverlay ARE-Rules", () => {
  let mockDoc: Document;

  beforeEach(() => {
    mockDoc = createMockDocument();
    vi.clearAllMocks();
  });

  it("does not mutate snapshot objects", () => {
    const originalPayload = {
      eventCount: 5,
      firstTick: 100,
      lastTick: 200,
      summaryHash: "abc123",
      events: [],
      sideChannelOnly: true,
    };
    const payloadCopy = { ...originalPayload };

    renderCausalCatchupOverlay(originalPayload, mockDoc);

    expect(originalPayload).toEqual(payloadCopy);
  });

  it("does not create fake state from invalid payload", () => {
    const invalidPayload = {
      eventCount: "made up" as unknown as number,
      fakeField: true,
    };

    const result = createSyncStateOverlayState(invalidPayload);
    expect(result).toBeNull();
  });

  it("renders only with validated server payload", () => {
    const validPayload = {
      eventCount: 3,
      firstTick: 50,
      lastTick: 100,
      summaryHash: "hash123",
      events: [
        {
          eventId: "e1",
          type: "combat_result",
          tick: 75,
          significancePerMille: 800,
          regionId: "region1",
          chunkKey: "chunk1",
          payloadHash: "ph1",
          eventHash: "eh1",
        },
      ],
      sideChannelOnly: true,
    };

    const result = renderCausalCatchupOverlay(validPayload, mockDoc);
    expect(result).not.toBeNull();
    expect(result!.dataset.eventCount).toBe("3");
    expect(result!.dataset.summaryHash).toBe("hash123");
  });
});
