import { mkdir, appendFile, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { inspect } from "node:util";

export type AREShadowLogEntry = {
  tick: number;
  at: string;
  capacity: number | null;
  size: number | null;
  latestTick: number | null;
  latestEntityId: string | null;
  latestStateHash: string | null;
  divergence: unknown;
  ecosystem: unknown;
  economy: unknown;
  electroweakPruning: unknown;
  type?: string | null;
  status?: string | null;
  source?: string | null;
  testFile?: string | null;
  caseName?: string | null;
  probeHash?: string | null;
  discrepancy?: string | null;
  recommendation?: string | null;
  truthPath?: string | null;
};

function safeStringify(data: unknown, depth = 4): string {
  const seen = new WeakSet();
  const replacer = (_key: string, value: unknown): unknown => {
    if (typeof value === "object" && value !== null) {
      if (seen.has(value as object)) return "[Circular]";
      seen.add(value as object);
    }
    if (typeof value === "function") return "[Function]";
    if (typeof value === "bigint") return value.toString();
    return value;
  };
  try {
    return JSON.stringify(data, replacer, 2);
  } catch {
    return inspect(data, { depth, customInspect: true });
  }
}

function safeJson(value: unknown, tick: number): unknown {
  try {
    if (value === undefined || value === null) return null;
    return JSON.parse(safeStringify(value));
  } catch {
    return { _error: "serialization_failed", tick };
  }
}

function stringOrNull(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  return String(value);
}

export class AREShadowLogSink {
  private readonly filePath: string;
  private readonly everyTicks: number;
  private pending: Promise<void> = Promise.resolve();

  constructor(options: { filePath?: string; everyTicks?: number } = {}) {
    this.filePath = resolve(process.cwd(), options.filePath ?? process.env.ARE_SHADOW_LOG_PATH ?? "logs/are-shadow.jsonl");
    this.everyTicks = Math.max(1, Math.trunc((options.everyTicks ?? Number(process.env.ARE_SHADOW_LOG_EVERY_TICKS)) || 60));
    console.log(`[AREShadowLogSink] Initialisiert: Pfad=${this.filePath}, EveryTicks=${this.everyTicks}`);
  }

  shouldWrite(tick: number): boolean {
    return tick > 0 && tick % this.everyTicks === 0;
  }

  async flush(): Promise<void> {
    console.log("[AREShadowLogSink] ⏳ Flush gestartet...");
    const currentPending = this.pending;
    this.pending = new Promise((resolve) => {
      currentPending.finally(() => {
        console.log("[AREShadowLogSink] ✅ Flush abgeschlossen - alle Writes persistiert");
        resolve();
      });
    });
    await this.pending;
  }

  async isReady(): Promise<boolean> {
    try {
      await stat(this.filePath);
      return true;
    } catch {
      return false;
    }
  }

  write(tick: number, stats: Partial<AREShadowLogEntry> & Record<string, unknown>): void {
    const isProbe = stats.type === "ARE_SHADOW_PROBE";
    if (!isProbe && !this.shouldWrite(tick)) return;

    const entry: AREShadowLogEntry = {
      tick,
      // @ARE-GUARD-EXEMPT: Audit log timestamp only; not a world-state input.
      at: new Date().toISOString(),
      capacity: Number.isFinite(Number(stats.capacity)) ? Number(stats.capacity) : null,
      size: Number.isFinite(Number(stats.size)) ? Number(stats.size) : null,
      latestTick: Number.isFinite(Number(stats.latestTick)) ? Number(stats.latestTick) : Number.isFinite(Number(stats.tick)) ? Number(stats.tick) : null,
      latestEntityId: stats.latestEntityId ? String(stats.latestEntityId) : stats.source ? `shadow:${String(stats.source)}` : null,
      latestStateHash: stats.latestStateHash ? String(stats.latestStateHash) : stats.probeHash ? String(stats.probeHash) : null,
      divergence: stats.divergence ?? (isProbe ? safeJson(stats, tick) : null),
      ecosystem: safeJson(stats.ecosystem, tick),
      economy: stats.economy ?? null,
      electroweakPruning: stats.electroweakPruning ?? null,
      type: stringOrNull(stats.type),
      status: stringOrNull(stats.status),
      source: stringOrNull(stats.source),
      testFile: stringOrNull(stats.testFile),
      caseName: stringOrNull(stats.caseName),
      probeHash: stringOrNull(stats.probeHash),
      discrepancy: stringOrNull(stats.discrepancy),
      recommendation: stringOrNull(stats.recommendation),
      truthPath: stringOrNull(stats.truthPath),
    };

    const line = `${JSON.stringify(entry)}\n`;
    const byteLength = Buffer.byteLength(line, "utf8");
    this.pending = this.pending
      .then(async () => {
        await mkdir(dirname(this.filePath), { recursive: true });
        await appendFile(this.filePath, line, "utf8");
        console.log(`[AREShadowLogSink] 📝 Flushed ${byteLength} bytes, tick=${tick}, type=${entry.type ?? "tick"}`);
      })
      .catch((error) => {
        console.error("[AREShadowLogSink] ❌ Write fehlgeschlagen:", error);
      });
  }

  getPath(): string {
    return this.filePath;
  }
}
