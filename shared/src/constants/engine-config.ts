export const TICK_RATE = 10;
export const TICK_INTERVAL_MS = 100;

export const ENGINE_CONFIG = {
    TICK_RATE,
    TICK_INTERVAL_MS,
    FIXED_DELTA_TIME: 1 / TICK_RATE,
    MAX_SUBSTEPS: 5,
    DETERMINISTIC: true
};

export interface EngineConfig {
    tickRate: number;
    tickIntervalMs: number;
    fixedDeltaTime: number;
    maxSubSteps: number;
    deterministic: boolean;
}

export const getDeterministicInferenceConfig = (): EngineConfig => ({
    tickRate: TICK_RATE,
    tickIntervalMs: TICK_INTERVAL_MS,
    fixedDeltaTime: 1 / TICK_RATE,
    maxSubSteps: 1,
    deterministic: true
});