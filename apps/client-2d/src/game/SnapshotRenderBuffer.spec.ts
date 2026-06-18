import { describe, expect, it } from "vitest";
import { clampVisualAlpha } from "./SnapshotRenderBuffer";

describe("SnapshotRenderBuffer", () => {
  it("clamps render alpha", () => {
    expect(clampVisualAlpha(-1)).toBe(0);
    expect(clampVisualAlpha(2)).toBe(1);
  });
});
