/**
 * Unit tests for ARE Heartbeat determinism
 * 
 * Verifies that createAREHeartbeatSnapshot produces stable,
 * deterministic output for replay verification.
 */

import { describe, expect, it } from "vitest";
import { createAREHeartbeatSnapshot, stableHash } from "../routes/areHeartbeatUtils.js";

describe("ARE heartbeat determinism", () => {
  describe("stableHash", () => {
    it("produces consistent output for same input", () => {
      const input = "areloria|tick=123|kappa=1000|observers=4";
      const hash1 = stableHash(input);
      const hash2 = stableHash(input);
      expect(hash1).toBe(hash2);
    });

    it("produces different output for different inputs", () => {
      const hash1 = stableHash("areloria|tick=123|kappa=1000|observers=4");
      const hash2 = stableHash("areloria|tick=456|kappa=1000|observers=4");
      expect(hash1).not.toBe(hash2);
    });

    it("produces 8-character hex string", () => {
      const hash = stableHash("test");
      expect(hash).toMatch(/^[0-9a-f]{8}$/);
    });
  });

  describe("createAREHeartbeatSnapshot", () => {
    it("returns stable snapshot for identical input", () => {
      const a = createAREHeartbeatSnapshot({
        tickId: 123,
        observerCount: 4,
        worldSeed: "areloria",
      });

      const b = createAREHeartbeatSnapshot({
        tickId: 123,
        observerCount: 4,
        worldSeed: "areloria",
      });

      expect(a).toEqual(b);
    });

    it("kappa is exactly 1000", () => {
      const snapshot = createAREHeartbeatSnapshot({
        tickId: 123,
        observerCount: 0,
      });
      expect(snapshot.kappa).toBe(1000);
    });

    it("tickId and serverTick are equal", () => {
      const snapshot = createAREHeartbeatSnapshot({
        tickId: 456,
        observerCount: 2,
      });
      expect(snapshot.tickId).toBe(snapshot.serverTick);
      expect(snapshot.tickId).toBe(456);
    });

    it("heartbeatStatus is 'live'", () => {
      const snapshot = createAREHeartbeatSnapshot({
        tickId: 789,
        observerCount: 1,
      });
      expect(snapshot.heartbeatStatus).toBe("live");
    });

    it("replayHash is 8 characters", () => {
      const snapshot = createAREHeartbeatSnapshot({
        tickId: 100,
        observerCount: 5,
      });
      expect(snapshot.replayHash).toMatch(/^[0-9a-f]{8}$/);
    });

    it("replayHash changes when tickId changes", () => {
      const a = createAREHeartbeatSnapshot({
        tickId: 100,
        observerCount: 5,
        worldSeed: "test",
      });
      const b = createAREHeartbeatSnapshot({
        tickId: 200,
        observerCount: 5,
        worldSeed: "test",
      });
      expect(a.replayHash).not.toBe(b.replayHash);
    });

    it("replayHash changes when observerCount changes", () => {
      const a = createAREHeartbeatSnapshot({
        tickId: 100,
        observerCount: 5,
        worldSeed: "test",
      });
      const b = createAREHeartbeatSnapshot({
        tickId: 100,
        observerCount: 10,
        worldSeed: "test",
      });
      expect(a.replayHash).not.toBe(b.replayHash);
    });

    it("replayHash changes when worldSeed changes", () => {
      const a = createAREHeartbeatSnapshot({
        tickId: 100,
        observerCount: 5,
        worldSeed: "seed1",
      });
      const b = createAREHeartbeatSnapshot({
        tickId: 100,
        observerCount: 5,
        worldSeed: "seed2",
      });
      expect(a.replayHash).not.toBe(b.replayHash);
    });

    it("handles zero observer count", () => {
      const snapshot = createAREHeartbeatSnapshot({
        tickId: 50,
        observerCount: 0,
      });
      expect(snapshot.observerCount).toBe(0);
    });
  });
});