import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { deterministicNow } from "./determinism/AREDeterminism.js";

export type WorldResonanceStatus = "STABLE" | "WATCH" | "CRITICAL" | "DECOMPOSITION";

export interface WorldResonanceSnapshot {
  tick: number;
  timestamp: number;
  divergence: number;
  entropy: number;
  stability: number;
  npcCritical: number;
  npcDecomposition: number;
  status: WorldResonanceStatus;
}

export interface WorldResonanceTickInput {
  tick?: number | null;
  divergence?: number | null;
  entropy?: number | null;
  npcCritical?: number | null;
  npcDecomposition?: number | null;
}

const DEFAULT_SNAPSHOT: WorldResonanceSnapshot = {
  tick: 0,
  timestamp: deterministicNow(0),
  divergence: 0,
  entropy: 0,
  stability: 1,
  npcCritical: 0,
  npcDecomposition: 0,
  status: "STABLE",
};

function finiteNonNegative(value: unknown, fallback = 0): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(0, numeric);
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export class WorldResonanceAdapter {
  private snapshot: WorldResonanceSnapshot = { ...DEFAULT_SNAPSHOT };

  constructor(private readonly shadowLogPath = path.resolve(process.cwd(), "logs", "are-shadow.jsonl")) {}

  public getSnapshot(): WorldResonanceSnapshot {
    return { ...this.snapshot, timestamp: deterministicNow(this.snapshot.tick) };
  }

  public updateFromTick(input: WorldResonanceTickInput): WorldResonanceSnapshot {
    const divergence = finiteNonNegative(input.divergence);
    const npcCritical = Math.trunc(finiteNonNegative(input.npcCritical));
    const npcDecomposition = Math.trunc(finiteNonNegative(input.npcDecomposition));
    const entropy = finiteNonNegative(
      input.entropy,
      // Corrected: Removed legacy 1000x multiplier from divergence to align with standard stability thresholds
      divergence + npcCritical * 0.05 + npcDecomposition * 0.15,
    );
    const stability = clamp01(1 - entropy);
    const tick = Math.trunc(finiteNonNegative(input.tick, this.snapshot.tick));
    const status = this.resolveStatus({ divergence, stability, npcCritical, npcDecomposition });

    this.snapshot = {
      tick,
      timestamp: deterministicNow(tick),
      divergence,
      entropy,
      stability,
      npcCritical,
      npcDecomposition,
      status,
    };

    return this.getSnapshot();
  }

  public loadLatestShadowEntry(): WorldResonanceSnapshot {
    if (!existsSync(this.shadowLogPath)) return this.getSnapshot();

    try {
      const raw = readFileSync(this.shadowLogPath, "utf8").trim();
      if (!raw) return this.getSnapshot();

      const lastLine = raw.split(/\r?\n/).filter(Boolean).at(-1);
      if (!lastLine) return this.getSnapshot();

      const parsed = JSON.parse(lastLine) as Record<string, unknown>;
      return this.updateFromTick({
        tick: (parsed.tick ?? parsed.l ?? parsed.logicalIndex) as number,
        divergence: (parsed.divergence ?? parsed.drift ?? parsed.delta) as number,
        entropy: parsed.entropy as number,
        npcCritical: (parsed.npcCritical ?? parsed.criticalNpcCount ?? parsed.critical) as number,
        npcDecomposition: (parsed.npcDecomposition ?? parsed.decompositionNpcCount ?? parsed.decomposition) as number,
      });
    } catch {
      return this.getSnapshot();
    }
  }

  public resolveStatus(input: {
    divergence: number;
    stability: number;
    npcCritical: number;
    npcDecomposition: number;
  }): WorldResonanceStatus {
    if (input.npcDecomposition > 0 || input.stability < 0.25) return "DECOMPOSITION";
    if (input.npcCritical > 0 || input.divergence > 0.01) return "CRITICAL";
    if (input.divergence > 0.001 || input.stability < 0.8) return "WATCH";
    return "STABLE";
  }
}

export const worldResonanceAdapter = new WorldResonanceAdapter();
