// @ARE-GUARD-EXEMPT: Legacy non-deterministic calls permitted in non-simulation context
/**
 * LiveHeal v2 - Local Learning Store
 *
 * Persists heuristic learning data about healing strategy effectiveness.
 * No black-box AI: explainable, JSON-based, dependency-light.
 * Robust against corrupt files - never crashes the engine.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type {
  LearningEntry,
  StrategyScore,
  ErrorSignatureKey,
  LoadBand,
} from "./LiveHealTypes.js";

function safeReadJson<T>(filePath: string, fallback: T): T {
  try {
    if (!fs.existsSync(filePath)) {
      return fallback;
    }
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeWriteJson(filePath: string, data: unknown): boolean {
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
    return true;
  } catch {
    return false;
  }
}

function makeSignatureKey(sig: ErrorSignatureKey): string {
  return `${sig.subsystem}|${sig.errorCode}|${sig.symptomTagHash}|${sig.loadBand}`;
}

export function hashSymptomTags(tags: string[]): string {
  // Simple deterministic hash: sorted, joined
  return [...tags].sort().join(",");
}

export class LiveHealLearningStore {
  private readonly storePath: string;
  private readonly entries = new Map<string, LearningEntry>();
  private dirty = false;
  private persistTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(storePath: string) {
    this.storePath = storePath;
    this.load();
  }

  private load(): void {
    const data = safeReadJson<LearningEntry[]>(this.storePath, []);
    for (const entry of data) {
      if (entry && typeof entry.signatureKey === "string") {
        this.entries.set(entry.signatureKey, entry);
      }
    }
  }

  /**
   * Schedule a debounced persist (avoids excessive disk writes).
   */
  private schedulePersist(): void {
    this.dirty = true;
    if (this.persistTimer !== null) {
      return;
    }
    this.persistTimer = setTimeout(() => {
      this.persistTimer = null;
      if (this.dirty) {
        this.persist();
      }
    }, 5000);
  }

  private persist(): void {
    if (!this.dirty) {
      return;
    }
    this.dirty = false;
    const data = Array.from(this.entries.values());
    safeWriteJson(this.storePath, data);
  }

  /**
   * Record the outcome of a healing attempt.
   */
  recordOutcome(
    sig: ErrorSignatureKey,
    strategyName: string,
    success: boolean,
    recoveryMs: number,
    sideEffects: string[],
    featureSafe: boolean
  ): void {
    const key = makeSignatureKey(sig);
    const now = Date.now();
    const existing = this.entries.get(key);

    if (existing) {
      existing.occurrenceCount += 1;
      existing.lastStrategy = strategyName;
      existing.lastSuccess = success;
      if (success) {
        existing.successCount += 1;
      } else {
        existing.failureCount += 1;
      }
      // Exponential moving average for recovery time
      const alpha = 0.3;
      existing.avgRecoveryMs = existing.avgRecoveryMs * (1 - alpha) + recoveryMs * alpha;
      if (!success) {
        existing.relapseCount += 1;
      }
      existing.lastSideEffects = sideEffects;
      if (!featureSafe) {
        existing.featureSafe = false;
      }
      existing.lastLoadBand = sig.loadBand;
      existing.lastSeenAt = now;
    } else {
      this.entries.set(key, {
        signatureKey: key,
        occurrenceCount: 1,
        lastStrategy: strategyName,
        lastSuccess: success,
        successCount: success ? 1 : 0,
        failureCount: success ? 0 : 1,
        avgRecoveryMs: recoveryMs,
        relapseCount: success ? 0 : 1,
        lastSideEffects: sideEffects,
        featureSafe,
        lastLoadBand: sig.loadBand,
        lastSeenAt: now,
        firstSeenAt: now,
      });
    }

    this.schedulePersist();
  }

  /**
   * Get scored strategies for a given error signature.
   * Higher scores mean better historical performance.
   */
  getStrategyScores(sig: ErrorSignatureKey): StrategyScore[] {
    const key = makeSignatureKey(sig);
    const entry = this.entries.get(key);
    if (!entry) {
      return [];
    }

    const total = entry.successCount + entry.failureCount;
    const successRate = total > 0 ? entry.successCount / total : 0;
    const relapseRate = total > 0 ? entry.relapseCount / total : 0;
    const sideEffectRate = entry.occurrenceCount > 0
      ? (entry.lastSideEffects.length > 0 ? 0.5 : 0)
      : 0;

    // Score formula: weighted combination
    // 40% success rate, 20% low recovery time, 20% low relapse, 10% no side effects, 10% feature safe
    const recoveryFactor = Math.max(0, 1 - entry.avgRecoveryMs / 30000);
    const score =
      successRate * 0.4 +
      recoveryFactor * 0.2 +
      (1 - relapseRate) * 0.2 +
      (1 - sideEffectRate) * 0.1 +
      (entry.featureSafe ? 0.1 : 0);

    return [
      {
        strategyName: entry.lastStrategy,
        score: Math.round(score * 100) / 100,
        successRate: Math.round(successRate * 100) / 100,
        avgRecoveryMs: Math.round(entry.avgRecoveryMs),
        relapseRate: Math.round(relapseRate * 100) / 100,
        sideEffectRate: Math.round(sideEffectRate * 100) / 100,
        featureSafe: entry.featureSafe,
      },
    ];
  }

  /**
   * Get the best strategy name for a given error signature, or null if no data.
   */
  getBestStrategy(sig: ErrorSignatureKey): string | null {
    const scores = this.getStrategyScores(sig);
    if (scores.length === 0) {
      return null;
    }
    scores.sort((a, b) => b.score - a.score);
    return scores[0].strategyName;
  }

  /**
   * Get the full learning entry for a signature.
   */
  getEntry(sig: ErrorSignatureKey): LearningEntry | null {
    return this.entries.get(makeSignatureKey(sig)) ?? null;
  }

  /**
   * Get all entries for introspection.
   */
  getAllEntries(): LearningEntry[] {
    return Array.from(this.entries.values());
  }

  /**
   * Get count of tracked signatures.
   */
  get size(): number {
    return this.entries.size;
  }

  /**
   * Force immediate persist.
   */
  flush(): void {
    if (this.persistTimer !== null) {
      clearTimeout(this.persistTimer);
      this.persistTimer = null;
    }
    this.persist();
  }

  /**
   * Prune entries not seen in the last maxAgeMs.
   */
  prune(maxAgeMs: number): number {
    const cutoff = Date.now() - maxAgeMs;
    let pruned = 0;
    for (const [key, entry] of this.entries) {
      if (entry.lastSeenAt < cutoff) {
        this.entries.delete(key);
        pruned += 1;
      }
    }
    if (pruned > 0) {
      this.schedulePersist();
    }
    return pruned;
  }
}
