export type AREMode = "off" | "cpu" | "shader";

export type AutoPolicyState = {
  lowFpsSamples: number;
  stableSamples: number;
  overridesDisabledUntilMs: number;
};

export type AutoPolicyDecision = {
  nextMode: AREMode | null;
  reason: "low_fps" | "stable_fps" | null;
  nextState: AutoPolicyState;
};

export type AutoPolicyConfig = {
  cooldownMs: number;
  lowFpsThreshold: number;
  stableFpsThreshold: number;
  lowSampleTrigger: number;
  stableSampleTrigger: number;
};

const DEFAULT_POLICY_CONFIG: AutoPolicyConfig = {
  cooldownMs: 4000,
  lowFpsThreshold: 28,
  stableFpsThreshold: 48,
  lowSampleTrigger: 4,
  stableSampleTrigger: 8,
};

function sanitizeNumber(value: unknown, fallback: number, min: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(min, parsed) : fallback;
}

export function normalizeAutoPolicyConfig(raw: unknown): AutoPolicyConfig {
  const source = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    cooldownMs: sanitizeNumber(source.cooldownMs, DEFAULT_POLICY_CONFIG.cooldownMs, 250),
    lowFpsThreshold: sanitizeNumber(source.lowFpsThreshold, DEFAULT_POLICY_CONFIG.lowFpsThreshold, 1),
    stableFpsThreshold: sanitizeNumber(source.stableFpsThreshold, DEFAULT_POLICY_CONFIG.stableFpsThreshold, 1),
    lowSampleTrigger: sanitizeNumber(source.lowSampleTrigger, DEFAULT_POLICY_CONFIG.lowSampleTrigger, 1),
    stableSampleTrigger: sanitizeNumber(source.stableSampleTrigger, DEFAULT_POLICY_CONFIG.stableSampleTrigger, 1),
  };
}

function resolveConfig(config?: Partial<AutoPolicyConfig>): AutoPolicyConfig {
  if (!config) {
    return DEFAULT_POLICY_CONFIG;
  }
  return normalizeAutoPolicyConfig({ ...DEFAULT_POLICY_CONFIG, ...config });
}

export function defaultAutoPolicyState(): AutoPolicyState {
  return {
    lowFpsSamples: 0,
    stableSamples: 0,
    overridesDisabledUntilMs: 0,
  };
}

export function evaluateAREAutoModePolicy(
  currentMode: AREMode,
  fps: number,
  nowMs: number,
  prev: AutoPolicyState,
  config?: Partial<AutoPolicyConfig>
): AutoPolicyDecision {
  const policy = resolveConfig(config);
  const state: AutoPolicyState = { ...prev };
  if (nowMs < state.overridesDisabledUntilMs) {
    return { nextMode: null, reason: null, nextState: state };
  }

  if (fps < policy.lowFpsThreshold) {
    state.lowFpsSamples += 1;
    state.stableSamples = 0;
  } else if (fps > policy.stableFpsThreshold) {
    state.stableSamples += 1;
    state.lowFpsSamples = Math.max(0, state.lowFpsSamples - 1);
  } else {
    state.lowFpsSamples = Math.max(0, state.lowFpsSamples - 1);
    state.stableSamples = Math.max(0, state.stableSamples - 1);
  }

  if (state.lowFpsSamples >= policy.lowSampleTrigger) {
    state.lowFpsSamples = 0;
    state.stableSamples = 0;
    state.overridesDisabledUntilMs = nowMs + policy.cooldownMs;
    if (currentMode === "shader") {
      return { nextMode: "cpu", reason: "low_fps", nextState: state };
    }
    if (currentMode === "cpu") {
      return { nextMode: "off", reason: "low_fps", nextState: state };
    }
    return { nextMode: null, reason: null, nextState: state };
  }

  if (state.stableSamples >= policy.stableSampleTrigger) {
    state.lowFpsSamples = 0;
    state.stableSamples = 0;
    state.overridesDisabledUntilMs = nowMs + policy.cooldownMs;
    if (currentMode === "off") {
      return { nextMode: "cpu", reason: "stable_fps", nextState: state };
    }
    if (currentMode === "cpu") {
      return { nextMode: "shader", reason: "stable_fps", nextState: state };
    }
    return { nextMode: null, reason: null, nextState: state };
  }

  return { nextMode: null, reason: null, nextState: state };
}
