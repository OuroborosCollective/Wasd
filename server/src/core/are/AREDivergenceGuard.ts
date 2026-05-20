import type { AREReplayBuffer } from './AREReplayBuffer';
import { toKappa } from './Kappa';

export type AREDivergenceStatus = 'ok' | 'warn' | 'critical';

export interface AREDivergenceVector {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface AREDivergenceSample {
  readonly tick: number;
  readonly entityId: string;
  readonly status: AREDivergenceStatus;
  readonly drift: AREDivergenceVector;
  readonly magnitude: number;
  readonly legacyKappa: AREDivergenceVector;
  readonly areKappa: AREDivergenceVector;
  readonly areStateHash: number | null;
}

export interface AREDivergenceSummary {
  readonly status: AREDivergenceStatus;
  readonly samples: number;
  readonly ok: number;
  readonly warn: number;
  readonly critical: number;
  readonly maxMagnitude: number;
  readonly latest?: AREDivergenceSample;
}

export interface AREDivergenceThresholds {
  readonly warn: number;
  readonly critical: number;
}

const DEFAULT_THRESHOLDS: AREDivergenceThresholds = {
  warn: 1000,
  critical: 10000,
};

export class AREDivergenceGuard {
  private readonly samples: AREDivergenceSample[] = [];

  constructor(private readonly thresholds: AREDivergenceThresholds = DEFAULT_THRESHOLDS, private readonly capacity = 256) {
    if (!Number.isSafeInteger(capacity) || capacity <= 0) {
      throw new Error('[ARE-Divergence] capacity must be a positive safe integer.');
    }
  }

  measure(tick: number, entityId: string, legacyPosition: unknown, buffer: AREReplayBuffer): AREDivergenceSample | null {
    const entry = buffer.get(tick, entityId) ?? buffer.latest(entityId);
    if (!entry) return null;

    const legacyKappa = AREDivergenceGuard.toKappaVector(legacyPosition);
    const areKappa = entry.payload.position;
    const drift = {
      x: Math.abs(legacyKappa.x - areKappa.x),
      y: Math.abs(legacyKappa.y - areKappa.y),
      z: Math.abs(legacyKappa.z - areKappa.z),
    };
    const magnitude = drift.x + drift.y + drift.z;
    const status = magnitude >= this.thresholds.critical ? 'critical' : magnitude >= this.thresholds.warn ? 'warn' : 'ok';

    const sample: AREDivergenceSample = Object.freeze({
      tick,
      entityId,
      status,
      drift: Object.freeze(drift),
      magnitude,
      legacyKappa: Object.freeze(legacyKappa),
      areKappa: Object.freeze({ x: areKappa.x, y: areKappa.y, z: areKappa.z }),
      areStateHash: entry.stateHash ?? null,
    });

    this.samples.push(sample);
    while (this.samples.length > this.capacity) this.samples.shift();
    return sample;
  }

  summarize(): AREDivergenceSummary {
    let ok = 0;
    let warn = 0;
    let critical = 0;
    let maxMagnitude = 0;

    for (const sample of this.samples) {
      if (sample.status === 'critical') critical += 1;
      else if (sample.status === 'warn') warn += 1;
      else ok += 1;
      if (sample.magnitude > maxMagnitude) maxMagnitude = sample.magnitude;
    }

    const status: AREDivergenceStatus = critical > 0 ? 'critical' : warn > 0 ? 'warn' : 'ok';
    const latest = this.samples[this.samples.length - 1];
    return Object.freeze({ status, samples: this.samples.length, ok, warn, critical, maxMagnitude, latest });
  }

  private static toKappaVector(position: unknown): AREDivergenceVector {
    const source = (position ?? {}) as Record<string, unknown>;
    return {
      x: toKappa(AREDivergenceGuard.toNumber(source.x)),
      y: toKappa(AREDivergenceGuard.toNumber(source.y)),
      z: toKappa(AREDivergenceGuard.toNumber(source.z)),
    };
  }

  private static toNumber(value: unknown): number {
    if (value === null || value === undefined) return 0;
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new Error(`[ARE-Divergence] Invalid legacy position value: ${String(value)}.`);
    }
    return value;
  }
}
