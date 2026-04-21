/**
 * WorldLayoutLearningStore - Heuristic learning for layout repairs (no AI).
 *
 * Tracks which repair strategies worked for which issue patterns.
 * Persists to JSON. Robust against corrupt files.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { LayoutLearningEntry } from "./WorldLayoutTypes.js";

function safeReadJson<T>(filePath: string, fallback: T): T {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
  } catch { return fallback; }
}

function safeWriteJson(filePath: string, data: unknown): void {
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  } catch { /* best effort */ }
}

export class WorldLayoutLearningStore {
  private readonly storePath: string;
  private readonly entries = new Map<string, LayoutLearningEntry>();
  private dirty = false;
  private persistTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(storePath: string) {
    this.storePath = storePath;
    this.load();
  }

  private load(): void {
    const data = safeReadJson<LayoutLearningEntry[]>(this.storePath, []);
    for (const entry of data) {
      if (entry?.patternKey) this.entries.set(entry.patternKey, entry);
    }
  }

  private schedulePersist(): void {
    this.dirty = true;
    if (this.persistTimer !== null) return;
    this.persistTimer = setTimeout(() => {
      this.persistTimer = null;
      if (this.dirty) this.persist();
    }, 5000);
  }

  private persist(): void {
    if (!this.dirty) return;
    this.dirty = false;
    safeWriteJson(this.storePath, Array.from(this.entries.values()));
  }

  /**
   * Record the outcome of a repair attempt.
   */
  recordOutcome(category: string, issueCode: string, strategy: string, success: boolean): void {
    const key = `${category}:${issueCode}`;
    const now = Date.now();
    const existing = this.entries.get(key);

    if (existing) {
      existing.occurrenceCount += 1;
      if (success) {
        existing.successCount += 1;
        existing.successfulStrategy = strategy;
      } else {
        existing.failureCount += 1;
      }
      existing.lastSeenAt = now;
    } else {
      this.entries.set(key, {
        patternKey: key,
        occurrenceCount: 1,
        successfulStrategy: success ? strategy : "",
        successCount: success ? 1 : 0,
        failureCount: success ? 0 : 1,
        lastSeenAt: now,
        firstSeenAt: now,
      });
    }
    this.schedulePersist();
  }

  /**
   * Get the best strategy for an issue pattern.
   */
  getBestStrategy(category: string, issueCode: string): string | null {
    const key = `${category}:${issueCode}`;
    const entry = this.entries.get(key);
    if (!entry || entry.successfulStrategy === "") return null;
    const total = entry.successCount + entry.failureCount;
    if (total > 0 && entry.successCount / total < 0.3) return null; // Don't recommend failing strategies
    return entry.successfulStrategy;
  }

  /**
   * Get all entries for introspection.
   */
  getAll(): LayoutLearningEntry[] {
    return Array.from(this.entries.values());
  }

  get size(): number { return this.entries.size; }

  flush(): void {
    if (this.persistTimer !== null) { clearTimeout(this.persistTimer); this.persistTimer = null; }
    this.persist();
  }

  prune(maxAgeMs: number): number {
    const cutoff = Date.now() - maxAgeMs;
    let pruned = 0;
    for (const [key, entry] of this.entries) {
      if (entry.lastSeenAt < cutoff) { this.entries.delete(key); pruned++; }
    }
    if (pruned > 0) this.schedulePersist();
    return pruned;
  }
}
