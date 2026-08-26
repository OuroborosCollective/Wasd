/**
 * WorldLayoutReportLog - Structured, append-only NDJSON log for layout issues and repairs.
 *
 * Corruption-resistant: skips corrupt lines on read.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { LayoutReportEntry } from "./WorldLayoutTypes.js";

function ensureDir(dirPath: string): void {
  try { fs.mkdirSync(dirPath, { recursive: true }); } catch { /* best effort */ }
}

export class WorldLayoutReportLog {
  private readonly logPath: string;
  private readonly maxEntries: number;
  private sequence = 0;

  constructor(logPath: string, maxEntries = 5000) {
    this.logPath = logPath;
    this.maxEntries = maxEntries;
    ensureDir(path.dirname(logPath));
  }

  record(entry: Omit<LayoutReportEntry, "timestamp"> & { timestamp?: number }): LayoutReportEntry {
    const full: LayoutReportEntry = {
      ...entry,
      timestamp: normalizeDeterministicTimestamp(entry.timestamp, () => this.nextSequence()),
    };

    try {
      fs.appendFileSync(this.logPath, JSON.stringify(full) + "\n", "utf-8");
    } catch {
      // Silently degrade
    }
    return full;
  }

  readRecent(count: number): LayoutReportEntry[] {
    try {
      if (!fs.existsSync(this.logPath)) return [];
      const lines = fs.readFileSync(this.logPath, "utf-8").split("\n").filter((l) => l.trim().length > 0);
      const entries: LayoutReportEntry[] = [];
      for (let i = lines.length - 1; i >= 0 && entries.length < count; i--) {
        try {
          const parsed = JSON.parse(lines[i]) as LayoutReportEntry;
          if (parsed && typeof parsed.timestamp === "number") entries.unshift(parsed);
        } catch { /* skip corrupt */ }
      }
      return entries;
    } catch { return []; }
  }

  compact(): void {
    try {
      if (!fs.existsSync(this.logPath)) return;
      const lines = fs.readFileSync(this.logPath, "utf-8").split("\n").filter((l) => l.trim().length > 0);
      if (lines.length <= this.maxEntries) return;
      const keep = lines.slice(-this.maxEntries);
      fs.writeFileSync(this.logPath, keep.join("\n") + "\n", "utf-8");
    } catch { /* best effort */ }
  }

  get count(): number {
    try {
      if (!fs.existsSync(this.logPath)) return 0;
      return fs.readFileSync(this.logPath, "utf-8").split("\n").filter((l) => l.trim().length > 0).length;
    } catch { return 0; }
  }

  private nextSequence(): number {
    this.sequence += 1;
    return this.sequence;
  }
}

function normalizeDeterministicTimestamp(value: unknown, fallback: () => number): number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : fallback();
}
