// @vitest-environment jsdom
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { publishPlayerPositionBridge, readPlayerPositionBridge } from "./PlayerPositionBridge";

describe("PlayerPositionBridge", () => {
  beforeEach(() => {
    // Clear sessionStorage before each test
    sessionStorage.removeItem("wasd:2d:player-position:v1");
  });

  afterEach(() => {
    sessionStorage.removeItem("wasd:2d:player-position:v1");
  });

  describe("publishPlayerPositionBridge", () => {
    it("divides server kappa units by 1000 to get world units", () => {
      publishPlayerPositionBridge({ x: 460000, z: 500000 });
      const pos = readPlayerPositionBridge();
      expect(pos).toEqual({ x: 460, y: 500 });
    });

    it("ignores null input", () => {
      publishPlayerPositionBridge(null);
      expect(readPlayerPositionBridge()).toBeNull();
    });

    it("ignores undefined input", () => {
      publishPlayerPositionBridge(undefined);
      expect(readPlayerPositionBridge()).toBeNull();
    });

    it("ignores non-finite x", () => {
      publishPlayerPositionBridge({ x: NaN, z: 500000 } as any);
      expect(readPlayerPositionBridge()).toBeNull();
    });

    it("ignores non-finite z", () => {
      publishPlayerPositionBridge({ x: 460000, z: Infinity } as any);
      expect(readPlayerPositionBridge()).toBeNull();
    });

    it("stores most recent position", () => {
      publishPlayerPositionBridge({ x: 100000, z: 200000 });
      publishPlayerPositionBridge({ x: 460000, z: 500000 });
      const pos = readPlayerPositionBridge();
      expect(pos).toEqual({ x: 460, y: 500 });
    });
  });

  describe("readPlayerPositionBridge", () => {
    it("returns null when no position has been published", () => {
      expect(readPlayerPositionBridge()).toBeNull();
    });

    it("returns null for corrupted JSON", () => {
      sessionStorage.setItem("wasd:2d:player-position:v1", "not-json");
      expect(readPlayerPositionBridge()).toBeNull();
    });

    it("returns null for non-finite stored values", () => {
      sessionStorage.setItem("wasd:2d:player-position:v1", '{"x":"NaN","y":500}');
      expect(readPlayerPositionBridge()).toBeNull();
    });

    it("returns the stored world position", () => {
      sessionStorage.setItem("wasd:2d:player-position:v1", JSON.stringify({ x: 460.5, y: 500.75 }));
      const pos = readPlayerPositionBridge();
      expect(pos).toEqual({ x: 460.5, y: 500.75 });
    });
  });
});