import fs from "fs";
import path from "path";
import type { AREMode } from "./RuntimeSettingsStore.js";

export type AREModeAuditEntry = {
  timestamp: number;
  isoTime: string;
  oldMode: AREMode;
  newMode: AREMode;
  source: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  socketId: string;
  reason: string;
  unchanged: boolean;
};

export const DEFAULT_ARE_MODE_AUDIT_PATH = path.resolve(process.cwd(), "game-data/world/are-mode-audit.log");

function safeString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function clampLimit(limit: number): number {
  if (!Number.isFinite(limit)) return 50;
  return Math.max(1, Math.min(200, Math.floor(limit)));
}

export class AREModeAuditTrail {
  constructor(private readonly filePath: string = DEFAULT_ARE_MODE_AUDIT_PATH) {}

  logModeChange(input: {
    oldMode: AREMode;
    newMode: AREMode;
    source?: string;
    actorId?: string;
    actorName?: string;
    actorRole?: string;
    socketId?: string;
    reason?: string;
  }): AREModeAuditEntry {
    const timestamp = Date.now();
    const entry: AREModeAuditEntry = {
      timestamp,
      isoTime: new Date(timestamp).toISOString(),
      oldMode: input.oldMode,
      newMode: input.newMode,
      source: safeString(input.source, "gm_command") || "gm_command",
      actorId: safeString(input.actorId, "unknown"),
      actorName: safeString(input.actorName, "unknown"),
      actorRole: safeString(input.actorRole, "unknown"),
      socketId: safeString(input.socketId, "unknown"),
      reason: safeString(input.reason, "not_provided"),
      unchanged: input.oldMode === input.newMode,
    };
    const dir = path.dirname(this.filePath);
    fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(this.filePath, `${JSON.stringify(entry)}\n`, "utf-8");
    return entry;
  }

  getRecent(limit = 50): AREModeAuditEntry[] {
    const normalizedLimit = clampLimit(limit);
    if (!fs.existsSync(this.filePath)) {
      return [];
    }
    const raw = fs.readFileSync(this.filePath, "utf-8");
    if (!raw.trim()) {
      return [];
    }
    const lines = raw
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    const entries: AREModeAuditEntry[] = [];
    for (let i = lines.length - 1; i >= 0; i -= 1) {
      if (entries.length >= normalizedLimit) {
        break;
      }
      try {
        const parsed = JSON.parse(lines[i]) as AREModeAuditEntry;
        if (parsed && typeof parsed === "object") {
          entries.push(parsed);
        }
      } catch {
        // Ignore malformed lines so logs stay resilient.
      }
    }
    return entries;
  }
}
