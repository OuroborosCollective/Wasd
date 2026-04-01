import { describe, expect, it } from "vitest";
import {
  defaultAutoPolicyState,
  evaluateAREAutoModePolicy,
  normalizeAutoPolicyConfig,
} from "./AREPerformancePolicy";

describe("AREPerformancePolicy", () => {
  it("downgrades shader to cpu after repeated low FPS samples", () => {
    let state = defaultAutoPolicyState();
    let mode: "off" | "cpu" | "shader" = "shader";
    let decisionMode: "off" | "cpu" | "shader" | null = null;
    for (let i = 0; i < 4; i++) {
      const decision = evaluateAREAutoModePolicy(mode, 20, 10000 + i * 500, state);
      state = decision.nextState;
      decisionMode = decision.nextMode;
      if (decision.nextMode) {
        mode = decision.nextMode;
      }
    }
    expect(decisionMode).toBe("cpu");
  });

  it("upgrades off to cpu after stable FPS samples", () => {
    let state = defaultAutoPolicyState();
    let mode: "off" | "cpu" | "shader" = "off";
    let decisionMode: "off" | "cpu" | "shader" | null = null;
    for (let i = 0; i < 8; i++) {
      const decision = evaluateAREAutoModePolicy(mode, 60, 20000 + i * 500, state);
      state = decision.nextState;
      decisionMode = decision.nextMode;
      if (decision.nextMode) {
        mode = decision.nextMode;
      }
    }
    expect(decisionMode).toBe("cpu");
  });

  it("respects custom low-sample trigger from config", () => {
    let state = defaultAutoPolicyState();
    const config = normalizeAutoPolicyConfig({
      lowSampleTrigger: 2,
      stableSampleTrigger: 99,
      lowFpsThreshold: 30,
      stableFpsThreshold: 999,
      cooldownMs: 1000,
    });
    const first = evaluateAREAutoModePolicy("shader", 20, 1000, state, config);
    state = first.nextState;
    const second = evaluateAREAutoModePolicy("shader", 20, 1600, state, config);
    expect(second.nextMode).toBe("cpu");
  });
});
