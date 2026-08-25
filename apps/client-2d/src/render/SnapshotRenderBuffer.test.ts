import { describe, expect, it, beforeEach } from "vitest";
import {
  SnapshotRenderBuffer,
  classifySyncFreshness,
  readSnapshotTick,
  type SyncFreshnessState,
} from "./SnapshotRenderBuffer";

type TestSnapshot = { serverTick: number | null; label: string };

describe("SnapshotRenderBuffer", () => {
  describe("constructor", () => {
    it("throws for capacity less than 2", () => {
      expect(() => new SnapshotRenderBuffer(1)).toThrow("capacity must be at least 2");
      expect(() => new SnapshotRenderBuffer(0)).toThrow("capacity must be at least 2");
      expect(() => new SnapshotRenderBuffer(-1)).toThrow("capacity must be at least 2");
    });

    it("accepts valid capacity", () => {
      expect(() => new SnapshotRenderBuffer(2)).not.toThrow();
      expect(() => new SnapshotRenderBuffer(10)).not.toThrow();
    });
  });

  describe("push", () => {
    it("ignores snapshots with null tick", () => {
      const buffer = new SnapshotRenderBuffer<TestSnapshot>(3);
      buffer.push({ serverTick: null, label: "test" });
      expect(buffer.getFrames()).toHaveLength(0);
    });

    it("ignores snapshots with undefined tick", () => {
      const buffer = new SnapshotRenderBuffer<TestSnapshot>(3);
      buffer.push({ serverTick: undefined as unknown as null, label: "test" } as TestSnapshot);
      expect(buffer.getFrames()).toHaveLength(0);
    });

    it("adds valid snapshots", () => {
      const buffer = new SnapshotRenderBuffer<TestSnapshot>(3);
      buffer.push({ serverTick: 10, label: "a" });
      buffer.push({ serverTick: 20, label: "b" });
      expect(buffer.getFrames()).toHaveLength(2);
    });

    it("updates existing tick", () => {
      const buffer = new SnapshotRenderBuffer<TestSnapshot>(3);
      buffer.push({ serverTick: 10, label: "a" });
      buffer.push({ serverTick: 10, label: "b" });
      expect(buffer.getFrames()).toHaveLength(1);
      expect(buffer.latest()?.snapshot.label).toBe("b");
    });

    it("enforces capacity", () => {
      const buffer = new SnapshotRenderBuffer<TestSnapshot>(2);
      buffer.push({ serverTick: 1, label: "one" });
      buffer.push({ serverTick: 2, label: "two" });
      buffer.push({ serverTick: 3, label: "three" });
      expect(buffer.getFrames()).toHaveLength(2);
      expect(buffer.getFrames()[0].serverTick).toBe(2);
      expect(buffer.getFrames()[1].serverTick).toBe(3);
    });

    it("sorts by server tick", () => {
      const buffer = new SnapshotRenderBuffer<TestSnapshot>(5);
      buffer.push({ serverTick: 30, label: "c" });
      buffer.push({ serverTick: 10, label: "a" });
      buffer.push({ serverTick: 20, label: "b" });
      expect(buffer.getFrames()[0].serverTick).toBe(10);
      expect(buffer.getFrames()[1].serverTick).toBe(20);
      expect(buffer.getFrames()[2].serverTick).toBe(30);
    });

    it("stores receivedAtClientFrameMs", () => {
      const buffer = new SnapshotRenderBuffer<TestSnapshot>(3);
      buffer.push({ serverTick: 10, label: "test" }, 10, 12345);
      expect(buffer.latest()?.receivedAtClientFrameMs).toBe(12345);
    });
  });

  describe("latest", () => {
    it("returns null for empty buffer", () => {
      const buffer = new SnapshotRenderBuffer<TestSnapshot>(3);
      expect(buffer.latest()).toBeNull();
    });

    it("returns last pushed frame", () => {
      const buffer = new SnapshotRenderBuffer<TestSnapshot>(3);
      buffer.push({ serverTick: 10, label: "a" });
      buffer.push({ serverTick: 20, label: "b" });
      expect(buffer.latest()?.snapshot.label).toBe("b");
    });
  });

  describe("getRenderPair", () => {
    it("returns null for empty buffer", () => {
      const buffer = new SnapshotRenderBuffer<TestSnapshot>(3);
      expect(buffer.getRenderPair(10)).toBeNull();
    });

    it("returns pair for single frame", () => {
      const buffer = new SnapshotRenderBuffer<TestSnapshot>(3);
      const snap = { serverTick: 10, label: "a" };
      buffer.push(snap);
      const pair = buffer.getRenderPair(10);
      expect(pair).not.toBeNull();
      expect(pair?.previous.snapshot).toBe(snap);
      expect(pair?.current.snapshot).toBe(snap);
      expect(pair?.alpha).toBe(1);
    });

    it("interpolates between two frames", () => {
      const buffer = new SnapshotRenderBuffer<TestSnapshot>(3);
      buffer.push({ serverTick: 10, label: "a" });
      buffer.push({ serverTick: 20, label: "b" });

      // Target tick 15 is halfway between 10 and 20
      const pair = buffer.getRenderPair(15);
      expect(pair?.alpha).toBe(0.5);
    });

    it("renders the earliest frame fully for target ticks before the buffer range", () => {
      const buffer = new SnapshotRenderBuffer<TestSnapshot>(3);
      buffer.push({ serverTick: 10, label: "a" });
      buffer.push({ serverTick: 20, label: "b" });

      // Target tick 5 is before both frames, so previous and current collapse
      // to the earliest known frame.
      const pair = buffer.getRenderPair(5);
      expect(pair?.previous.serverTick).toBe(10);
      expect(pair?.current.serverTick).toBe(10);
      expect(pair?.alpha).toBe(1);
    });

    it("clamps visualAlpha before applying it as an interpolation multiplier", () => {
      const buffer = new SnapshotRenderBuffer<TestSnapshot>(3);
      buffer.push({ serverTick: 10, label: "a" });
      buffer.push({ serverTick: 20, label: "b" });
      const pair = buffer.getRenderPair(15, 2);
      expect(pair?.alpha).toBe(0.5);
    });

    it("returns null when frames are in wrong order", () => {
      const buffer = new SnapshotRenderBuffer<TestSnapshot>(3);
      // Directly manipulate frames to create invalid state
      (buffer as unknown as { frames: Array<{ serverTick: number | null; snapshot: TestSnapshot }> }).frames.push(
        { serverTick: 20, snapshot: { serverTick: 20, label: "a" } },
        { serverTick: 10, snapshot: { serverTick: 10, label: "b" } },
      );
      expect(buffer.getRenderPair(15)).toBeNull();
    });
  });

  describe("getConnectionFreshness", () => {
    it("returns waiting state for empty buffer", () => {
      const buffer = new SnapshotRenderBuffer<TestSnapshot>(3);
      const freshness = buffer.getConnectionFreshness(10);
      expect(freshness.state).toBe("waiting");
      expect(freshness.latestServerTick).toBeNull();
    });

    it("returns fresh state for recent tick", () => {
      const buffer = new SnapshotRenderBuffer<TestSnapshot>(3);
      buffer.push({ serverTick: 10, label: "a" });
      const freshness = buffer.getConnectionFreshness(11);
      expect(freshness.state).toBe("fresh");
    });

    it("returns stale_long for old tick", () => {
      const buffer = new SnapshotRenderBuffer<TestSnapshot>(3);
      buffer.push({ serverTick: 10, label: "a" });
      const freshness = buffer.getConnectionFreshness(100);
      expect(freshness.state).toBe("stale_long");
    });
  });

  describe("clear", () => {
    it("removes all frames", () => {
      const buffer = new SnapshotRenderBuffer<TestSnapshot>(3);
      buffer.push({ serverTick: 10, label: "a" });
      buffer.push({ serverTick: 20, label: "b" });
      buffer.clear();
      expect(buffer.getFrames()).toHaveLength(0);
      expect(buffer.latest()).toBeNull();
    });
  });
});

describe("classifySyncFreshness", () => {
  it("returns waiting for null latest tick", () => {
    expect(classifySyncFreshness(null, 10)).toBe("waiting");
  });

  it("returns waiting for null render tick", () => {
    expect(classifySyncFreshness(10, null)).toBe("waiting");
  });

  it("returns waiting for undefined ticks", () => {
    expect(classifySyncFreshness(undefined, 10)).toBe("waiting");
    expect(classifySyncFreshness(10, undefined)).toBe("waiting");
  });

  it("returns fresh for ticks within freshTicks", () => {
    expect(classifySyncFreshness(10, 11)).toBe("fresh");
    expect(classifySyncFreshness(10, 12)).toBe("fresh");
  });

  it("returns stale_short for ticks within staleShortTicks", () => {
    expect(classifySyncFreshness(10, 18)).toBe("stale_short");
    expect(classifySyncFreshness(10, 19)).toBe("stale_short");
  });

  it("returns stale_medium for ticks within staleMediumTicks", () => {
    expect(classifySyncFreshness(10, 35)).toBe("stale_medium");
    expect(classifySyncFreshness(10, 39)).toBe("stale_medium");
  });

  it("returns stale_long for ticks beyond staleMediumTicks", () => {
    expect(classifySyncFreshness(10, 60)).toBe("stale_long");
    expect(classifySyncFreshness(10, 100)).toBe("stale_long");
  });

  it("returns waiting when latest tick is ahead", () => {
    expect(classifySyncFreshness(20, 10)).toBe("fresh");
  });

  it("handles negative tick age", () => {
    // Latest tick ahead of render tick is fine (normal case)
    expect(classifySyncFreshness(15, 10)).toBe("fresh");
  });
});

describe("readSnapshotTick", () => {
  it("returns null for null input", () => {
    expect(readSnapshotTick(null)).toBeNull();
  });

  it("returns null for undefined input", () => {
    expect(readSnapshotTick(undefined)).toBeNull();
  });

  it("returns null for non-object input", () => {
    expect(readSnapshotTick("string")).toBeNull();
    expect(readSnapshotTick(123)).toBeNull();
  });

  it("returns null for object without serverTick", () => {
    expect(readSnapshotTick({})).toBeNull();
  });

  it("returns normalized tick for valid serverTick", () => {
    expect(readSnapshotTick({ serverTick: 10 })).toBe(10);
    expect(readSnapshotTick({ serverTick: 10.5 })).toBe(10); // Floored
    expect(readSnapshotTick({ serverTick: -5 })).toBeNull(); // Negative rejected
  });
});
