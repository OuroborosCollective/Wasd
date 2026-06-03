import { describe, expect, it } from "vitest";

import {
  classifyViewportMode,
  classifyViewportOrientation,
  DESKTOP_BREAKPOINT,
  MOBILE_BREAKPOINT,
  TABLET_BREAKPOINT,
  WORLD_SERVER_TICK_HZ,
  WORLD_SERVER_TICK_MS,
} from "./use-mobile";

describe("deterministic viewport classification", () => {
  it("uses strict integer breakpoints for layout mode", () => {
    expect(classifyViewportMode(0)).toBe("mobile");
    expect(classifyViewportMode(MOBILE_BREAKPOINT - 1)).toBe("mobile");
    expect(classifyViewportMode(MOBILE_BREAKPOINT)).toBe("tablet");
    expect(classifyViewportMode(TABLET_BREAKPOINT - 1)).toBe("tablet");
    expect(classifyViewportMode(TABLET_BREAKPOINT)).toBe("desktop");
    expect(classifyViewportMode(DESKTOP_BREAKPOINT - 1)).toBe("desktop");
    expect(classifyViewportMode(DESKTOP_BREAKPOINT)).toBe("wide");
  });

  it("sanitizes invalid viewport widths deterministically", () => {
    expect(classifyViewportMode(Number.NaN)).toBe("mobile");
    expect(classifyViewportMode(Number.POSITIVE_INFINITY)).toBe("mobile");
    expect(classifyViewportMode(-42)).toBe("mobile");
    expect(classifyViewportMode(767.99)).toBe("mobile");
    expect(classifyViewportMode(768.99)).toBe("tablet");
  });

  it("classifies orientation without wall-clock or random input", () => {
    expect(classifyViewportOrientation(390, 844)).toBe("portrait");
    expect(classifyViewportOrientation(844, 390)).toBe("landscape");
    expect(classifyViewportOrientation(768, 768)).toBe("square");
    expect(classifyViewportOrientation(Number.NaN, 0)).toBe("square");
  });

  it("documents the world-server layout coalescing cadence", () => {
    expect(WORLD_SERVER_TICK_HZ).toBe(10);
    expect(WORLD_SERVER_TICK_MS).toBe(100);
  });
});
