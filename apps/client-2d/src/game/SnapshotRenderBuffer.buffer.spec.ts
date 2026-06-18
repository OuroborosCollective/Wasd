import { describe, expect, it } from "vitest";
import { SnapshotRenderBuffer, classifySyncFreshness } from "./SnapshotRenderBuffer";

type TestSnapshot = { serverTick: number | null; label: string };

describe("render frame buffer", () => {
  it("keeps bounded frames", () => {
    const buffer = new SnapshotRenderBuffer<TestSnapshot>(2);
    buffer.push({ serverTick: 1, label: "one" });
    buffer.push({ serverTick: 2, label: "two" });
    buffer.push({ serverTick: 3, label: "three" });

    expect(buffer.getFrames().map((frame) => frame.serverTick)).toEqual([2, 3]);
    expect(buffer.latest()?.snapshot.label).toBe("three");
  });

  it("returns a pair from existing frames", () => {
    const buffer = new SnapshotRenderBuffer<TestSnapshot>(3);
    const a = { serverTick: 10, label: "a" };
    const b = { serverTick: 20, label: "b" };
    buffer.push(a);
    buffer.push(b);

    const pair = buffer.getRenderPair(15);
    expect(pair?.previous.snapshot).toBe(a);
    expect(pair?.current.snapshot).toBe(b);
    expect(pair?.alpha).toBe(0.5);
  });

  it("classifies freshness from explicit ticks", () => {
    expect(classifySyncFreshness(null, 12)).toBe("waiting");
    expect(classifySyncFreshness(10, 12)).toBe("fresh");
    expect(classifySyncFreshness(10, 18)).toBe("stale_short");
    expect(classifySyncFreshness(10, 35)).toBe("stale_medium");
    expect(classifySyncFreshness(10, 60)).toBe("stale_long");
  });
});
