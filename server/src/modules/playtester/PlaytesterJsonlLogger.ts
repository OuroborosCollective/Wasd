import { mkdirSync, appendFileSync } from "node:fs";
import { dirname } from "node:path";

/**
 * Options for PlaytesterJsonlLogger
 */
export interface PlaytesterJsonlLoggerOptions {
  readonly logPath: string;
  readonly enabled: boolean;
}

/**
 * JSONL Logger for Playtester events.
 * Writes one JSON object per line to the specified path.
 * Machine-readable format for log aggregation and analysis.
 */
export class PlaytesterJsonlLogger {
  constructor(private readonly options: PlaytesterJsonlLoggerOptions) {
    if (options.enabled) {
      mkdirSync(dirname(options.logPath), { recursive: true });
    }
  }

  /**
   * Write a log event to the JSONL file.
   * The event tick is the canonical deterministic time source.
   */
  write(event: unknown): void {
    if (!this.options.enabled) return;

    const record = event as Record<string, unknown>;
    const tick = typeof record.tick === "number" && Number.isFinite(record.tick) ? Math.trunc(record.tick) : 0;
    const line = JSON.stringify({
      loggedTick: tick,
      simulationMs: tick * 100,
      ...record,
    });

    appendFileSync(this.options.logPath, `${line}\n`, "utf8");
  }

  /**
   * Flush any buffered writes (no-op for this implementation, but allows interface compatibility)
   */
  flush(): void {
    // No-op: appendFileSync is synchronous and immediate
  }
}
