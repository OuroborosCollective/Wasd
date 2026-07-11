import { stableHash32 } from "../core/determinism/AREDeterminism.js";
import type { RuntimeHistoryEntry, RuntimeHistoryWriteInput } from "./RuntimeHistoryTypes.js";

function stableStringify(value: unknown): string {
  if (value === null || value === undefined) return String(value);
  if (typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;

  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort((a, b) => a.localeCompare(b))
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(",")}}`;
}

function normalizeTick(value: number): number {
  if (!Number.isSafeInteger(value) || value < 0) return 0;
  return value;
}

function normalizeText(value: string, fallback: string): string {
  const trimmed = String(value ?? "").trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

export class RuntimeHistoryLog {
  private readonly entries: RuntimeHistoryEntry[] = [];

  write(input: RuntimeHistoryWriteInput): RuntimeHistoryEntry {
    const sequence = this.entries.length;
    const tick = normalizeTick(input.tick);
    const actorId = normalizeText(input.actorId, "system");
    const subjectId = normalizeText(input.subjectId, "unknown");
    const chunkKey = normalizeText(input.chunkKey ?? "0:0", "0:0");
    const payloadHash = stableHash32(stableStringify(input.payload)).toString(16);
    const entrySeed = ["RUNTIME_HISTORY_V1", sequence, tick, input.source, actorId, subjectId, chunkKey, payloadHash].join("|");

    const entry = Object.freeze({
      schemaVersion: 1 as const,
      sequence,
      tick,
      source: input.source,
      actorId,
      subjectId,
      chunkKey,
      payloadHash,
      entryHash: stableHash32(entrySeed).toString(16),
    });

    this.entries.push(entry);
    return entry;
  }

  captureLength(): number {
    return this.entries.length;
  }

  truncate(length: number): void {
    if (!Number.isSafeInteger(length) || length < 0 || length > this.entries.length) {
      throw new Error("invalid_runtime_history_length");
    }
    this.entries.length = length;
  }

  latestByActor(actorId: string): RuntimeHistoryEntry | null {
    for (let index = this.entries.length - 1; index >= 0; index -= 1) {
      const entry = this.entries[index];
      if (entry.actorId === actorId) return Object.freeze({ ...entry });
    }
    return null;
  }

  list(): readonly RuntimeHistoryEntry[] {
    return Object.freeze(this.entries.map((entry) => Object.freeze({ ...entry })));
  }

  listByActor(actorId: string): readonly RuntimeHistoryEntry[] {
    return Object.freeze(this.entries.filter((entry) => entry.actorId === actorId).map((entry) => Object.freeze({ ...entry })));
  }

  clearForTests(): void {
    this.entries.length = 0;
  }
}

export const runtimeHistoryLog = new RuntimeHistoryLog();
