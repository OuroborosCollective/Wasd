import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { publishPlayerPositionBridge, readPlayerPositionBridge } from "./PlayerPositionBridge";

describe("PlayerPositionBridge", () => {
  // PlayerPositionBridge uses sessionStorage, which is shared across the module.
  // We need to reset it between tests.
  const KEY = "wasd:2d:player-position:v1";

  beforeEach(() => {
    sessionStorage.removeItem(KEY);
  });

  afterEach(() => {
    sessionStorage.removeItem(KEY);
  });

  describe("publishPlayerPositionBridge", () => {
    it("stores player position from server heartbeat (kappa units)", () => {
      publishPlayerPositionBridge({ x: 460_000, z: 500_000 });
      const stored = sessionStorage.getItem(KEY);
      expect(stored).toBe('{"x":460,"y":500}');
    });

    it("handles fractional kappa values", () => {
      publishPlayerPositionBridge({ x: 460_123, z: 500_567 });
      const stored = sessionStorage.getItem(KEY);
      expect(stored).toBe('{"x":460.123,"y":500.567}');
    });

    it("ignores null/undefined input", () => {
      publishPlayerPositionBridge(null);
      expect(sessionStorage.getItem(KEY)).toBeNull();

      publishPlayerPositionBridge(undefined);
      expect(sessionStorage.getItem(KEY)).toBeNull();
    });

    it("ignores non-finite x/z values", () => {
      publishPlayerPositionBridge({ x: NaN, z: 500_000 });
      expect(sessionStorage.getItem(KEY)).toBeNull();

      publishPlayerPositionBridge({ x: Infinity, z: 500_000 });
      expect(sessionStorage.getItem(KEY)).toBeNull();
    });

    it("allows zero values", () => {
      publishPlayerPositionBridge({ x: 0, z: 0 });
      const stored = sessionStorage.getItem(KEY);
      expect(stored).toBe('{"x":0,"y":0}');
    });
  });

  describe("readPlayerPositionBridge", () => {
    it("returns null when nothing is stored", () => {
      expect(readPlayerPositionBridge()).toBeNull();
    });

    it("reads position stored by publish", () => {
      publishPlayerPositionBridge({ x: 540_000, z: 520_000 });
      const pos = readPlayerPositionBridge();
      expect(pos).toEqual({ x: 540, y: 520 });
    });

    it("returns null for corrupted JSON", () => {
      sessionStorage.setItem(KEY, "not json");
      expect(readPlayerPositionBridge()).toBeNull();
    });

    it("returns null for non-finite coordinates in stored data", () => {
      sessionStorage.setItem(KEY, '{"x":NaN,"y":500}');
      expect(readPlayerPositionBridge()).toBeNull();
    });

    it("returns full position for valid stored data", () => {
      sessionStorage.setItem(KEY, '{"x":460.5,"y":500.8}');
      const pos = readPlayerPositionBridge();
      expect(pos).toEqual({ x: 460.5, y: 500.8 });
    });
  });

  describe("end-to-end publish → read", () => {
    it("round-trip: publish from server heartbeat → read for gather intent", () => {
      // Simulate: server sends heartbeat with player position in kappa units (x: 460000, z: 500000)
      publishPlayerPositionBridge({ x: 460_000, z: 500_000 });

      // ResourceNodeMarkerLayer reads the bridge
      const pos = readPlayerPositionBridge();
      expect(pos).toEqual({ x: 460, y: 500 });

      // This position can be used in createResourceGatherIntent
      // which divides by 1000 again → { x: 0.460, y: 0.500 } (tile units)
      // But since we store already-divided values (x: 460, y: 500),
      // the adapter will normalize to { x: 0.460, y: 0.500 } after *another* division.
      // Wait — let me check the adapter...
      // The adapter normalizes position by dividing by 1000 internally.
      // So if we pass { x: 460, y: 500 }, the adapter would try to pass { x: 0.460, y: 0.500 }
      // to the server. But the server expects tile units already divided by 1000.
      //
      // Actually looking at the adapter code:
      //   y: Math.round(x * 1000) / 1000  →  460 * 1000 / 1000 = 460
      // So it rounds to 3 decimal places but doesn't divide.
      // And the server route parses playerPosition.x/y directly (not dividing).
      // So { x: 460, y: 500 } is the tile unit representation (460000/1000 = 460).
      // That matches the starter node positions like { x: 460, y: 500 }.
      expect(pos?.x).toBe(460);
      expect(pos?.y).toBe(500);
    });
  });
});