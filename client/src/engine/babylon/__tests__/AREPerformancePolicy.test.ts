import { describe, it, expect } from "vitest";
import {
  evaluateAREAutoModePolicy,
  normalizeAutoPolicyConfig,
  defaultAutoPolicyState,
  type AREMode,
  type AutoPolicyState,
} from "../AREPerformancePolicy";

// ---------------------------------------------------------------------------
// defaultAutoPolicyState
// ---------------------------------------------------------------------------
describe("defaultAutoPolicyState", () => {
  it("returns zero-initialised counters", () => {
    const state = defaultAutoPolicyState();
    expect(state.lowFpsSamples).toBe(0);
    expect(state.stableSamples).toBe(0);
    expect(state.overridesDisabledUntilMs).toBe(0);
  });

  it("returns a fresh object on each call (no shared reference)", () => {
    const a = defaultAutoPolicyState();
    const b = defaultAutoPolicyState();
    a.lowFpsSamples = 99;
    expect(b.lowFpsSamples).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// normalizeAutoPolicyConfig
// ---------------------------------------------------------------------------
describe("normalizeAutoPolicyConfig", () => {
  it("returns defaults when called with undefined", () => {
    const cfg = normalizeAutoPolicyConfig(undefined);
    expect(cfg.cooldownMs).toBe(4000);
    expect(cfg.lowFpsThreshold).toBe(28);
    expect(cfg.stableFpsThreshold).toBe(48);
    expect(cfg.lowSampleTrigger).toBe(4);
    expect(cfg.stableSampleTrigger).toBe(8);
  });

  it("returns defaults when called with null", () => {
    const cfg = normalizeAutoPolicyConfig(null);
    expect(cfg.cooldownMs).toBe(4000);
  });

  it("returns defaults when called with a non-object primitive", () => {
    const cfg = normalizeAutoPolicyConfig(42);
    expect(cfg.cooldownMs).toBe(4000);
  });

  it("uses provided valid numeric values", () => {
    const cfg = normalizeAutoPolicyConfig({
      cooldownMs: 2000,
      lowFpsThreshold: 20,
      stableFpsThreshold: 60,
      lowSampleTrigger: 3,
      stableSampleTrigger: 6,
    });
    expect(cfg.cooldownMs).toBe(2000);
    expect(cfg.lowFpsThreshold).toBe(20);
    expect(cfg.stableFpsThreshold).toBe(60);
    expect(cfg.lowSampleTrigger).toBe(3);
    expect(cfg.stableSampleTrigger).toBe(6);
  });

  it("falls back to defaults for NaN values", () => {
    const cfg = normalizeAutoPolicyConfig({ cooldownMs: NaN, lowFpsThreshold: NaN });
    expect(cfg.cooldownMs).toBe(4000);
    expect(cfg.lowFpsThreshold).toBe(28);
  });

  it("falls back to defaults for non-numeric string values", () => {
    const cfg = normalizeAutoPolicyConfig({ cooldownMs: "fast" as any });
    expect(cfg.cooldownMs).toBe(4000);
  });

  it("clamps cooldownMs to minimum of 250", () => {
    const cfg = normalizeAutoPolicyConfig({ cooldownMs: 10 });
    expect(cfg.cooldownMs).toBe(250);
  });

  it("clamps lowFpsThreshold to minimum of 1", () => {
    const cfg = normalizeAutoPolicyConfig({ lowFpsThreshold: 0 });
    expect(cfg.lowFpsThreshold).toBe(1);
  });

  it("clamps stableSampleTrigger to minimum of 1", () => {
    const cfg = normalizeAutoPolicyConfig({ stableSampleTrigger: -5 });
    expect(cfg.stableSampleTrigger).toBe(1);
  });

  it("accepts string-coercible numbers", () => {
    const cfg = normalizeAutoPolicyConfig({ cooldownMs: "3000" as any });
    expect(cfg.cooldownMs).toBe(3000);
  });
});

// ---------------------------------------------------------------------------
// evaluateAREAutoModePolicy
// ---------------------------------------------------------------------------
describe("evaluateAREAutoModePolicy", () => {
  const NOW = 10_000;

  function makeState(overrides: Partial<AutoPolicyState> = {}): AutoPolicyState {
    return { ...defaultAutoPolicyState(), ...overrides };
  }

  // --- cooldown guard ---
  it("returns null nextMode while in cooldown period", () => {
    const state = makeState({ overridesDisabledUntilMs: NOW + 5000 });
    const result = evaluateAREAutoModePolicy("cpu", 15, NOW, state);
    expect(result.nextMode).toBeNull();
    expect(result.reason).toBeNull();
  });

  // --- low FPS accumulation ---
  it("increments lowFpsSamples when FPS is below threshold", () => {
    const state = makeState({ lowFpsSamples: 0 });
    const result = evaluateAREAutoModePolicy("shader", 10, NOW, state);
    expect(result.nextState.lowFpsSamples).toBe(1);
    expect(result.nextState.stableSamples).toBe(0);
  });

  it("does NOT trigger mode change until lowSampleTrigger is met", () => {
    // default lowSampleTrigger = 4; start at 2 samples → not yet triggered
    const state = makeState({ lowFpsSamples: 2 });
    const result = evaluateAREAutoModePolicy("shader", 10, NOW, state);
    expect(result.nextMode).toBeNull();
    expect(result.nextState.lowFpsSamples).toBe(3);
  });

  it("downgrades shader → cpu on low FPS trigger", () => {
    // start at lowSampleTrigger - 1 = 3; one more low-FPS sample fires the trigger
    const state = makeState({ lowFpsSamples: 3 });
    const result = evaluateAREAutoModePolicy("shader", 10, NOW, state);
    expect(result.nextMode).toBe("cpu");
    expect(result.reason).toBe("low_fps");
  });

  it("downgrades cpu → off on low FPS trigger", () => {
    const state = makeState({ lowFpsSamples: 3 });
    const result = evaluateAREAutoModePolicy("cpu", 10, NOW, state);
    expect(result.nextMode).toBe("off");
    expect(result.reason).toBe("low_fps");
  });

  it("returns null nextMode when already at off and low FPS fires", () => {
    const state = makeState({ lowFpsSamples: 3 });
    const result = evaluateAREAutoModePolicy("off", 10, NOW, state);
    expect(result.nextMode).toBeNull();
  });

  it("sets cooldown after a low-FPS downgrade", () => {
    const state = makeState({ lowFpsSamples: 3 });
    const cfg = { cooldownMs: 4000 };
    const result = evaluateAREAutoModePolicy("shader", 10, NOW, state, cfg);
    expect(result.nextState.overridesDisabledUntilMs).toBe(NOW + 4000);
  });

  it("resets counters after a low-FPS downgrade", () => {
    const state = makeState({ lowFpsSamples: 3, stableSamples: 2 });
    const result = evaluateAREAutoModePolicy("shader", 10, NOW, state);
    expect(result.nextState.lowFpsSamples).toBe(0);
    expect(result.nextState.stableSamples).toBe(0);
  });

  // --- stable FPS accumulation ---
  it("increments stableSamples when FPS is above stableFpsThreshold", () => {
    const state = makeState({ stableSamples: 0 });
    const result = evaluateAREAutoModePolicy("off", 60, NOW, state);
    expect(result.nextState.stableSamples).toBe(1);
  });

  it("decrements lowFpsSamples (min 0) when FPS is stable", () => {
    const state = makeState({ lowFpsSamples: 2 });
    const result = evaluateAREAutoModePolicy("off", 60, NOW, state);
    expect(result.nextState.lowFpsSamples).toBe(1);
  });

  it("upgrades off → cpu on stable FPS trigger", () => {
    // default stableSampleTrigger = 8; start at 7 samples
    const state = makeState({ stableSamples: 7 });
    const result = evaluateAREAutoModePolicy("off", 60, NOW, state);
    expect(result.nextMode).toBe("cpu");
    expect(result.reason).toBe("stable_fps");
  });

  it("upgrades cpu → shader on stable FPS trigger", () => {
    const state = makeState({ stableSamples: 7 });
    const result = evaluateAREAutoModePolicy("cpu", 60, NOW, state);
    expect(result.nextMode).toBe("shader");
    expect(result.reason).toBe("stable_fps");
  });

  it("returns null nextMode when already at shader and stable FPS fires", () => {
    const state = makeState({ stableSamples: 7 });
    const result = evaluateAREAutoModePolicy("shader", 60, NOW, state);
    expect(result.nextMode).toBeNull();
  });

  it("sets cooldown after a stable-FPS upgrade", () => {
    const state = makeState({ stableSamples: 7 });
    const result = evaluateAREAutoModePolicy("off", 60, NOW, state, { cooldownMs: 2000 });
    expect(result.nextState.overridesDisabledUntilMs).toBe(NOW + 2000);
  });

  it("resets counters after a stable-FPS upgrade", () => {
    const state = makeState({ stableSamples: 7, lowFpsSamples: 1 });
    const result = evaluateAREAutoModePolicy("off", 60, NOW, state);
    expect(result.nextState.stableSamples).toBe(0);
    expect(result.nextState.lowFpsSamples).toBe(0);
  });

  // --- mid-range FPS (between thresholds) ---
  it("decrements both counters (min 0) for mid-range FPS", () => {
    const state = makeState({ lowFpsSamples: 2, stableSamples: 3 });
    // mid = above lowFpsThreshold(28) but below stableFpsThreshold(48)
    const result = evaluateAREAutoModePolicy("cpu", 38, NOW, state);
    expect(result.nextState.lowFpsSamples).toBe(1);
    expect(result.nextState.stableSamples).toBe(2);
    expect(result.nextMode).toBeNull();
  });

  it("does not underflow counters below 0 in mid-range FPS", () => {
    const state = makeState({ lowFpsSamples: 0, stableSamples: 0 });
    const result = evaluateAREAutoModePolicy("cpu", 38, NOW, state);
    expect(result.nextState.lowFpsSamples).toBe(0);
    expect(result.nextState.stableSamples).toBe(0);
  });

  // --- custom config ---
  it("respects custom lowSampleTrigger via config", () => {
    const state = makeState({ lowFpsSamples: 1 });
    // trigger at 2 samples instead of default 4
    const result = evaluateAREAutoModePolicy("shader", 10, NOW, state, { lowSampleTrigger: 2 });
    expect(result.nextMode).toBe("cpu");
  });

  it("respects custom stableSampleTrigger via config", () => {
    const state = makeState({ stableSamples: 2 });
    // trigger at 3 samples instead of default 8
    const result = evaluateAREAutoModePolicy("off", 60, NOW, state, { stableSampleTrigger: 3 });
    expect(result.nextMode).toBe("cpu");
  });

  // --- nextState immutability ---
  it("does not mutate the input state object", () => {
    const state = makeState({ lowFpsSamples: 0 });
    evaluateAREAutoModePolicy("cpu", 10, NOW, state);
    expect(state.lowFpsSamples).toBe(0); // original untouched
  });
});
