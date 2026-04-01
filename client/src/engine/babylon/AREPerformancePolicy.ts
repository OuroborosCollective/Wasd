export type AREMode = "off" | "cpu" | "shader";

export type AutoPolicyState = {
  lowFpsSamples: number;
  stableSamples: number;
  overridesDisabledUntilMs: number;
};

export type AutoPolicyDecision = {
  nextMode: AREMode | null;
  nextState: AutoPolicyState;
};

const COOLDOWN_MS = 4000;
const LOW_FPS_THRESHOLD = 28;
const STABLE_FPS_THRESHOLD = 48;
const LOW_SAMPLE_TRIGGER = 4;
const STABLE_SAMPLE_TRIGGER = 8;

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
  prev: AutoPolicyState
): AutoPolicyDecision {
  const state: AutoPolicyState = { ...prev };
  if (nowMs < state.overridesDisabledUntilMs) {
    return { nextMode: null, nextState: state };
  }

  if (fps < LOW_FPS_THRESHOLD) {
    state.lowFpsSamples += 1;
    state.stableSamples = 0;
  } else if (fps > STABLE_FPS_THRESHOLD) {
    state.stableSamples += 1;
    state.lowFpsSamples = Math.max(0, state.lowFpsSamples - 1);
  } else {
    state.lowFpsSamples = Math.max(0, state.lowFpsSamples - 1);
    state.stableSamples = Math.max(0, state.stableSamples - 1);
  }

  if (state.lowFpsSamples >= LOW_SAMPLE_TRIGGER) {
    state.lowFpsSamples = 0;
    state.stableSamples = 0;
    state.overridesDisabledUntilMs = nowMs + COOLDOWN_MS;
    if (currentMode === "shader") {
      return { nextMode: "cpu", nextState: state };
    }
    if (currentMode === "cpu") {
      return { nextMode: "off", nextState: state };
    }
    return { nextMode: null, nextState: state };
  }

  if (state.stableSamples >= STABLE_SAMPLE_TRIGGER) {
    state.lowFpsSamples = 0;
    state.stableSamples = 0;
    state.overridesDisabledUntilMs = nowMs + COOLDOWN_MS;
    if (currentMode === "off") {
      return { nextMode: "cpu", nextState: state };
    }
    if (currentMode === "cpu") {
      return { nextMode: "shader", nextState: state };
    }
    return { nextMode: null, nextState: state };
  }

  return { nextMode: null, nextState: state };
}
