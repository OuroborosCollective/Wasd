// @ARE-GUARD-EXEMPT: Infrastructure, Meta, or Telemetry logic; not world-state critical.
/**
 * LiveHeal v2 - Structured Patch/Heal Log
 *
 * Append-only, structured, audit-friendly log of all healing operations.
 * Persisted locally as NDJSON for resilience against corruption.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { HealLogEntry } from "./LiveHealTypes.js";

function ensureDir(dirPath: string): void {
  try {
    fs.mkdirSync(dirPath, { recursive: true });
  } catch {
    // best effort
  }
}

function generatePatchId(): string {
  return `LH-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export class LiveHealPatchLog {
  private readonly logPath: string;
  private readonly maxEntries: number;

  constructor(logPath: string, maxEntries = 10000) {
    this.logPath = logPath;
    this.maxEntries = maxEntries;
    ensureDir(path.dirname(logPath));
  }

  /**
   * Record a healing event. Appends to NDJSON log file.
   */
  record(entry: Omit<HealLogEntry, "patchId" | "timestamp">): HealLogEntry {
    const full: HealLogEntry = {
      ...entry,
      patchId: generatePatchId(),
      timestamp: Date.now(),
    };

    try {
      const line = JSON.stringify(full) + "\n";
      fs.appendFileSync(this.logPath, line, "utf-8");
    } catch {
      // If append fails, try writing to a fallback path
      try {
        const fallbackPath = this.logPath + ".fallback";
        const line = JSON.stringify(full) + "\n";
        fs.appendFileSync(fallbackPath, line, "utf-8");
      } catch {
        // Silently degrade if both paths fail
      }
    }

    return full;
  }

  /**
   * Read the last N entries from the log.
   * Handles corrupt lines gracefully by skipping them.
   */
  readRecent(count: number): HealLogEntry[] {
    try {
      if (!fs.existsSync(this.logPath)) {
        return [];
      }
      const content = fs.readFileSync(this.logPath, "utf-8");
      const lines = content.split("\n").filter((l) => l.trim().length > 0);

      const entries: HealLogEntry[] = [];
      // Read from the end
      for (let i = lines.length - 1; i >= 0 && entries.length < count; i--) {
        try {
          const parsed = JSON.parse(lines[i]) as HealLogEntry;
          if (parsed && typeof parsed.patchId === "string") {
            entries.unshift(parsed);
          }
        } catch {
          // Skip corrupt lines
        }
      }
      return entries;
    } catch {
      return [];
    }
  }

  /**
   * Read all entries (use with caution on large logs).
   */
  readAll(): HealLogEntry[] {
    try {
      if (!fs.existsSync(this.logPath)) {
        return [];
      }
      const content = fs.readFileSync(this.logPath, "utf-8");
      const lines = content.split("\n").filter((l) => l.trim().length > 0);
      const entries: HealLogEntry[] = [];
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line) as HealLogEntry;
          if (parsed && typeof parsed.patchId === "string") {
            entries.push(parsed);
          }
        } catch {
          // Skip corrupt lines
        }
      }
      return entries;
    } catch {
      return [];
    }
  }

  /**
   * Get entries for a specific subsystem.
   */
  readBySubsystem(subsystemId: string, count: number): HealLogEntry[] {
    const all = this.readAll();
    return all
      .filter((e) => e.subsystem === subsystemId)
      .slice(-count);
  }

  /**
   * Get success rate for a subsystem over the last N entries.
   */
  getSuccessRate(subsystemId: string, window: number): number {
    const entries = this.readBySubsystem(subsystemId, window);
    if (entries.length === 0) return 1;
    const successes = entries.filter((e) => e.success).length;
    return successes / entries.length;
  }

  /**
   * Check if a relapse occurred for a subsystem (failed heal, then succeeded, then failed again).
   */
  hasRelapse(subsystemId: string, windowMs: number): boolean {
    const entries = this.readBySubsystem(subsystemId, 20);
    const now = Date.now();
    const recent = entries.filter((e) => now - e.timestamp < windowMs);

    let pattern = "";
    for (const e of recent) {
      pattern += e.success ? "S" : "F";
    }
    // Look for S*F pattern (recovered then failed again)
    return /S+F/.test(pattern);
  }

  /**
   * Compact the log file: keep only the last maxEntries.
   */
  compact(): void {
    try {
      const entries = this.readAll();
      if (entries.length <= this.maxEntries) {
        return;
      }
      const keep = entries.slice(-this.maxEntries);
      const lines = keep.map((e) => JSON.stringify(e)).join("\n") + "\n";
      fs.writeFileSync(this.logPath, lines, "utf-8");
    } catch {
      // best effort
    }
  }

  /**
   * Get total entry count.
   */
  get count(): number {
    try {
      if (!fs.existsSync(this.logPath)) return 0;
      const content = fs.readFileSync(this.logPath, "utf-8");
      return content.split("\n").filter((l) => l.trim().length > 0).length;
    } catch {
      return 0;
    }
  }
}
