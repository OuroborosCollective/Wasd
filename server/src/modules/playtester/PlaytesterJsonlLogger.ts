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
   * @param event - The event object to log (will be merged with timestamp)
   */
  write(event: unknown): void {
    if (!this.options.enabled) return;

    const line = JSON.stringify({
      loggedAt: new Date().toISOString(),
      ...(event as Record<string, unknown>),
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