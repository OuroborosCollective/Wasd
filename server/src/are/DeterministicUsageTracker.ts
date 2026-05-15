export interface DeterministicUsageSample {
  tick: number;
  hashCount: number;
  reason: string;
}

export interface DeterministicUsageStats {
  windowTicks: number;
  samples: number;
  hashesInWindow: number;
  hashesPerMinute: number;
  latestTick: number;
  latestReason: string | null;
}

/**
 * Billing-grade deterministic usage meter.
 *
 * It intentionally uses tick windows instead of wall-clock time so replay,
 * billing previews and server-side audits all produce the same usage number
 * for the same simulation history.
 */
export class DeterministicUsageTracker {
  private readonly samples: DeterministicUsageSample[] = [];

  constructor(
    private readonly tickHz = 10,
    private readonly windowSeconds = 60,
  ) {}

  recordHashes(tick: number, hashCount: number, reason: string): DeterministicUsageStats {
    const normalizedTick = Number.isFinite(tick) ? Math.max(0, Math.floor(tick)) : 0;
    const normalizedCount = Number.isFinite(hashCount) ? Math.max(0, Math.floor(hashCount)) : 0;
    this.samples.push({ tick: normalizedTick, hashCount: normalizedCount, reason });
    this.compact(normalizedTick);
    return this.getStats(normalizedTick);
  }

  getStats(currentTick = this.samples.at(-1)?.tick ?? 0): DeterministicUsageStats {
    const windowTicks = this.tickHz * this.windowSeconds;
    const minTick = Math.max(0, Math.floor(currentTick) - windowTicks + 1);
    const active = this.samples.filter((sample) => sample.tick >= minTick && sample.tick <= currentTick);
    const hashesInWindow = active.reduce((sum, sample) => sum + sample.hashCount, 0);
    const latest = active.at(-1) ?? null;
    return {
      windowTicks,
      samples: active.length,
      hashesInWindow,
      hashesPerMinute: hashesInWindow,
      latestTick: latest?.tick ?? currentTick,
      latestReason: latest?.reason ?? null,
    };
  }

  reset(): void {
    this.samples.length = 0;
  }

  private compact(currentTick: number): void {
    const keepAfter = Math.max(0, currentTick - this.tickHz * this.windowSeconds + 1);
    while (this.samples.length > 0 && this.samples[0].tick < keepAfter) {
      this.samples.shift();
    }
  }
}

export const deterministicUsageTracker = new DeterministicUsageTracker();
