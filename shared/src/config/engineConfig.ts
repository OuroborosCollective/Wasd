export interface EngineConfig {
  tickRate: number;
  tickIntervalMs: number;
  snapshotRetentionLimit: number;
  inputQueueLimit: number;
  maxDriftMs: number;
  bufferThreshold: number;
}

export const ENGINE_CONFIG: EngineConfig = {
  tickRate: 10,
  tickIntervalMs: 1000 / 10,
  snapshotRetentionLimit: 50,
  inputQueueLimit: 20,
  maxDriftMs: 150,
  bufferThreshold: 5
};

export function getTickDurationMs(): number {
  return ENGINE_CONFIG.tickIntervalMs;
}

export function isQueueOverflow(currentSize: number): boolean {
  return currentSize >= ENGINE_CONFIG.inputQueueLimit;
}