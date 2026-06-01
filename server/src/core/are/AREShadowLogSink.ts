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
};

/**
 * Safe Payload Extraction - bricht Zirkelbezüge auf für deterministisches Logging.
 * Nutzt util.inspect mit depth-limit und custom replacer.
 */
function safeStringify(data: unknown, depth = 4): string {
  const seen = new WeakSet();
  const replacer = (_key: string, value: unknown): unknown => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value as object)) return '[Circular]';
      seen.add(value as object);
    }
    if (typeof value === 'function') return '[Function]';
    if (typeof value === 'bigint') return value.toString();
    return value;
  };
  try {
    return JSON.stringify(data, replacer, 2);
  } catch {
    // Fallback: util.inspect mit depth-limit
    return inspect(data, { depth, customInspect: true });
  }
}

export class AREShadowLogSink {
  private readonly filePath: string;
  private readonly everyTicks: number;
  private pending: Promise<void> = Promise.resolve();
  private flushReady: (() => void) | null = null;

  constructor(options: { filePath?: string; everyTicks?: number } = {}) {
    this.filePath = resolve(process.cwd(), options.filePath ?? process.env.ARE_SHADOW_LOG_PATH ?? "logs/are-shadow.jsonl");
    this.everyTicks = Math.max(1, Math.trunc((options.everyTicks ?? Number(process.env.ARE_SHADOW_LOG_EVERY_TICKS)) || 60));
    console.log(`[AREShadowLogSink] Initialisiert: Pfad=${this.filePath}, EveryTicks=${this.everyTicks}`);
  }

  shouldWrite(tick: number): boolean {
    return tick > 0 && tick % this.everyTicks === 0;
  }

  /**
   * Blockierender Flush - wartet bis alle pending Writes abgeschlossen sind.
   * MUST be called on server shutdown für I/O-Kausalität.
   */
  async flush(): Promise<void> {
    console.log('[AREShadowLogSink] ⏳ Flush gestartet...');
    const currentPending = this.pending;
    
    this.pending = new Promise((resolve) => {
      currentPending.finally(() => {
        console.log('[AREShadowLogSink] ✅ Flush abgeschlossen - alle Writes persistiert');
        resolve();
      });
    });
    
    await this.pending;
  }

  async isReady(): Promise<boolean> {
    try {
      const stats = await stat(this.filePath);
      return true;
    } catch {
      return false;
    }
  }

  write(tick: number, stats: AREShadowLogEntry): void {
    if (!this.shouldWrite(tick)) return;
    
    // Safe extraction - prevents circular ref crashes
    const safeEcosystem = (() => {
      try {
        if (stats.ecosystem === undefined || stats.ecosystem === null) return null;
        return JSON.parse(safeStringify(stats.ecosystem));
      } catch {
        return { _error: 'serialization_failed', tick };
      }
    })();

    const entry: AREShadowLogEntry = {
      tick,
      at: new Date().toISOString(),
      capacity: Number.isFinite(Number(stats?.capacity)) ? Number(stats.capacity) : null,
      size: Number.isFinite(Number(stats?.size)) ? Number(stats.size) : null,
      latestTick: Number.isFinite(Number(stats?.latestTick)) ? Number(stats.latestTick) : null,
      latestEntityId: stats?.latestEntityId ? String(stats.latestEntityId) : null,
      latestStateHash: stats?.latestStateHash ? String(stats.latestStateHash) : null,
      divergence: stats?.divergence ?? null,
      ecosystem: safeEcosystem,
      economy: stats?.economy ?? null,
      electroweakPruning: stats?.electroweakPruning ?? null,
    };

    const line = `${JSON.stringify(entry)}\n`;
    const byteLength = Buffer.byteLength(line, 'utf8');
    
    this.pending = this.pending
      .then(async () => {
        await mkdir(dirname(this.filePath), { recursive: true });
        await appendFile(this.filePath, line, "utf8");
        console.log(`[AREShadowLogSink] 📝 Flushed ${byteLength} bytes, tick=${tick}`);
      })
      .catch((error) => {
        console.error('[AREShadowLogSink] ❌ Write fehlgeschlagen:', error);
      });
  }

  getPath(): string {
    return this.filePath;
  }
}
