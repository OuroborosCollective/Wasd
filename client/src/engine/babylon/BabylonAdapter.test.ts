import { describe, expect, it } from "vitest";
import { defaultAutoPolicyState, evaluateAREAutoModePolicy } from "./AREPerformancePolicy";

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
});
