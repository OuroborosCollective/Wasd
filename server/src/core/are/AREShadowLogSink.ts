import { mkdir, appendFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

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
};

export class AREShadowLogSink {
  private readonly filePath: string;
  private readonly everyTicks: number;
  private pending: Promise<void> = Promise.resolve();

  constructor(options: { filePath?: string; everyTicks?: number } = {}) {
    this.filePath = resolve(process.cwd(), options.filePath ?? process.env.ARE_SHADOW_LOG_PATH ?? "logs/are-shadow.jsonl");
    this.everyTicks = Math.max(1, Math.trunc((options.everyTicks ?? Number(process.env.ARE_SHADOW_LOG_EVERY_TICKS)) || 60));
  }

  shouldWrite(tick: number): boolean {
    return tick > 0 && tick % this.everyTicks === 0;
  }

  write(tick: number, stats: any): void {
    if (!this.shouldWrite(tick)) return;
    const entry: AREShadowLogEntry = {
      tick,
      at: new Date().toISOString(),
      capacity: Number.isFinite(Number(stats?.capacity)) ? Number(stats.capacity) : null,
      size: Number.isFinite(Number(stats?.size)) ? Number(stats.size) : null,
      latestTick: Number.isFinite(Number(stats?.latestTick)) ? Number(stats.latestTick) : null,
      latestEntityId: stats?.latestEntityId ? String(stats.latestEntityId) : null,
      latestStateHash: stats?.latestStateHash ? String(stats.latestStateHash) : null,
      divergence: stats?.divergence ?? null,
      ecosystem: stats?.ecosystem ?? null,
      economy: stats?.economy ?? null,
      electroweakPruning: stats?.electroweakPruning ?? null,
    };

    const line = `${JSON.stringify(entry)}\n`;
    this.pending = this.pending
      .then(async () => {
        await mkdir(dirname(this.filePath), { recursive: true });
        await appendFile(this.filePath, line, "utf8");
      })
      .catch((error) => {
        console.error("[AREShadowLogSink] Failed to write ARE shadow log", error);
      });
  }

  getPath(): string {
    return this.filePath;
  }
}
