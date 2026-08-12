import { describe, expect, it } from "vitest";
import { projectWorldToScreen, projectWorldBatch } from "./WorldOverlayProjection";

describe("WorldOverlayProjection", () => {
  it("projects the origin to the screen center", () => {
    const result = projectWorldToScreen({ x: 0, y: 0 }, { screenWidth: 800, screenHeight: 600 });
    // iso2 with gridX=0, gridZ=0 → center x, 0.45*height y
    expect(result.screenX).toBeCloseTo(400, 5);
    expect(result.screenY).toBeCloseTo(270, 5);
  });

  it("is deterministic: same input always produces same output", () => {
    const vp = { screenWidth: 1000, screenHeight: 800 };
    const a = projectWorldToScreen({ x: 12, y: -5 }, vp);
    const b = projectWorldToScreen({ x: 12, y: -5 }, vp);
    expect(a).toEqual(b);
  });

  it("returns raw coords when viewport is zero-sized", () => {
    const result = projectWorldToScreen({ x: 42, y: 7 }, { screenWidth: 0, screenHeight: 0 });
    expect(result).toEqual({ screenX: 42, screenY: 7 });
  });

  it("produces consistent iso diamond separation", () => {
    const vp = { screenWidth: 800, screenHeight: 600 };
    const east = projectWorldToScreen({ x: 1, y: 0 }, vp);
    const south = projectWorldToScreen({ x: 0, y: 1 }, vp);
    const origin = projectWorldToScreen({ x: 0, y: 0 }, vp);
    // East moves screen-right and screen-down (gridX increases)
    expect(east.screenX).toBeGreaterThan(origin.screenX);
    // South moves screen-left and screen-down (gridZ increases)
    expect(south.screenX).toBeLessThan(origin.screenX);
    expect(south.screenY).toBeGreaterThan(origin.screenY);
  });

  it("projects a batch consistently with single calls", () => {
    const vp = { screenWidth: 1200, screenHeight: 900 };
    const coords = [
      { x: 0, y: 0 },
      { x: 3, y: 4 },
      { x: -2, y: 5 },
    ];
    const batch = projectWorldBatch(coords, vp);
    const singles = coords.map((c) => projectWorldToScreen(c, vp));
    expect(batch).toEqual(singles);
  });
});
