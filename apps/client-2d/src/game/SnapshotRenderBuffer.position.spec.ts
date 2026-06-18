import { describe, expect, it } from "vitest";
import { interpolateFacing, interpolatePosition } from "./SnapshotRenderBuffer";

describe("render interpolation", () => {
  it("interpolates positions", () => {
    expect(interpolatePosition({ x: 10, y: 20 }, { x: 30, y: 60 }, 0.5)).toEqual({ x: 20, y: 40 });
  });

  it("interpolates facing", () => {
    expect(interpolateFacing(350, 10, 0.5)).toBe(0);
  });
});
