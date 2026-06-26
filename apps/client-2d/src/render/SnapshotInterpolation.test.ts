import { describe, expect, it } from "vitest";
import {
  clampVisualAlpha,
  calculateRenderAlpha,
  interpolatePosition,
  interpolateFacing,
  lerpNumber,
  clamp,
} from "./SnapshotInterpolation";

describe("SnapshotInterpolation", () => {
  describe("clampVisualAlpha", () => {
    it("returns 0 for negative values", () => {
      expect(clampVisualAlpha(-1)).toBe(0);
      expect(clampVisualAlpha(-0.5)).toBe(0);
      expect(clampVisualAlpha(-Infinity)).toBe(0);
    });

    it("returns 1 for values greater than 1", () => {
      expect(clampVisualAlpha(2)).toBe(1);
      expect(clampVisualAlpha(1.5)).toBe(1);
      expect(clampVisualAlpha(Infinity)).toBe(0);
    });

    it("returns the same value for values in [0, 1]", () => {
      expect(clampVisualAlpha(0)).toBe(0);
      expect(clampVisualAlpha(0.5)).toBe(0.5);
      expect(clampVisualAlpha(1)).toBe(1);
    });

    it("returns 0 for NaN", () => {
      expect(clampVisualAlpha(NaN)).toBe(0);
    });
  });

  describe("calculateRenderAlpha", () => {
    it("returns 0 for non-finite values", () => {
      expect(calculateRenderAlpha(NaN, 100)).toBe(0);
      expect(calculateRenderAlpha(100, NaN)).toBe(0);
      expect(calculateRenderAlpha(Infinity, 100)).toBe(0);
    });

    it("returns 0 for negative tick duration", () => {
      expect(calculateRenderAlpha(50, -100)).toBe(0);
    });

    it("returns 0 for tick duration of 0", () => {
      expect(calculateRenderAlpha(50, 0)).toBe(0);
    });

    it("calculates correct alpha for valid inputs", () => {
      expect(calculateRenderAlpha(50, 100)).toBe(0.5);
      expect(calculateRenderAlpha(25, 100)).toBe(0.25);
      expect(calculateRenderAlpha(100, 100)).toBe(1);
      expect(calculateRenderAlpha(0, 100)).toBe(0);
    });

    it("clamps alpha greater than 1", () => {
      expect(calculateRenderAlpha(200, 100)).toBe(1);
    });
  });

  describe("interpolatePosition", () => {
    it("returns previous position at alpha 0", () => {
      const prev = { x: 10, y: 20 };
      const curr = { x: 30, y: 60 };
      expect(interpolatePosition(prev, curr, 0)).toEqual(prev);
    });

    it("returns current position at alpha 1", () => {
      const prev = { x: 10, y: 20 };
      const curr = { x: 30, y: 60 };
      expect(interpolatePosition(prev, curr, 1)).toEqual(curr);
    });

    it("returns midpoint at alpha 0.5", () => {
      const prev = { x: 10, y: 20 };
      const curr = { x: 30, y: 60 };
      expect(interpolatePosition(prev, curr, 0.5)).toEqual({ x: 20, y: 40 });
    });

    it("does not mutate original position objects", () => {
      const prev = { x: 10, y: 20 };
      const curr = { x: 30, y: 60 };
      const result = interpolatePosition(prev, curr, 0.5);
      expect(prev.x).toBe(10);
      expect(prev.y).toBe(20);
      expect(curr.x).toBe(30);
      expect(curr.y).toBe(60);
      expect(result).not.toBe(prev);
      expect(result).not.toBe(curr);
    });

    it("handles clamped alpha", () => {
      const prev = { x: 10, y: 20 };
      const curr = { x: 30, y: 60 };
      expect(interpolatePosition(prev, curr, -1)).toEqual(prev);
      expect(interpolatePosition(prev, curr, 2)).toEqual(curr);
    });
  });

  describe("interpolateFacing", () => {
    it("returns previous facing at alpha 0", () => {
      expect(interpolateFacing(90, 180, 0)).toBe(90);
    });

    it("returns current facing at alpha 1", () => {
      expect(interpolateFacing(90, 180, 1)).toBe(180);
    });

    it("interpolates through shortest arc", () => {
      // Clockwise from 350 to 10 = +20 degrees
      expect(interpolateFacing(350, 10, 0.5)).toBe(0);
    });

    it("handles wraparound at 0/360", () => {
      expect(interpolateFacing(350, 10, 0.5)).toBe(0);
      expect(interpolateFacing(10, 350, 0.5)).toBe(0);
    });

    it("handles opposite directions (180 degrees)", () => {
      expect(interpolateFacing(0, 180, 0.5)).toBe(90);
      expect(interpolateFacing(90, 270, 0.5)).toBe(180);
    });

    it("returns value in [0, 360) range", () => {
      expect(interpolateFacing(350, 10, 1)).toBeGreaterThanOrEqual(0);
      expect(interpolateFacing(350, 10, 1)).toBeLessThan(360);
    });

    it("returns 0 for invalid inputs", () => {
      expect(interpolateFacing(NaN, 180, 0.5)).toBe(0);
      expect(interpolateFacing(90, NaN, 0.5)).toBe(0);
    });
  });

  describe("lerpNumber", () => {
    it("returns previous at alpha 0", () => {
      expect(lerpNumber(10, 30, 0)).toBe(10);
    });

    it("returns current at alpha 1", () => {
      expect(lerpNumber(10, 30, 1)).toBe(30);
    });

    it("returns midpoint at alpha 0.5", () => {
      expect(lerpNumber(10, 30, 0.5)).toBe(20);
    });

    it("handles clamped alpha", () => {
      expect(lerpNumber(10, 30, -1)).toBe(10);
      expect(lerpNumber(10, 30, 2)).toBe(30);
    });
  });

  describe("clamp", () => {
    it("returns min for values below range", () => {
      expect(clamp(5, 10, 20)).toBe(10);
    });

    it("returns max for values above range", () => {
      expect(clamp(25, 10, 20)).toBe(20);
    });

    it("returns value when within range", () => {
      expect(clamp(15, 10, 20)).toBe(15);
    });

    it("returns min for NaN", () => {
      expect(clamp(NaN, 10, 20)).toBe(10);
    });
  });
});
