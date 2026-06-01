import type { PlaytesterEvent, PlaytesterLevel } from "./playtesterTypes.js";

export class PlaytesterTelemetry {
  private readonly maxEvents: number;
  private events: PlaytesterEvent[] = [];
  private warnings: string[] = [];
  private errors: string[] = [];

  constructor(maxEvents: number) {
    this.maxEvents = Math.max(10, Math.floor(maxEvents || 50));
  }

  push(tick: number, text: string, level: PlaytesterLevel = "info"): PlaytesterEvent {
    const event: PlaytesterEvent = {
      ts: 0 /* ARE-DETERMINISM-ALLOW: determinism placeholder */,
      tick,
      level,
      text,
    };
    this.events.push(event);
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(this.events.length - this.maxEvents);
    }
    if (level === "warn") {
      this.warnings.push(text);
      if (this.warnings.length > 10) this.warnings = this.warnings.slice(this.warnings.length - 10);
    }
    if (level === "error") {
      this.errors.push(text);
      if (this.errors.length > 10) this.errors = this.errors.slice(this.errors.length - 10);
    }
    return event;
  }

  getEvents(limit = 10): PlaytesterEvent[] {
    const take = Math.max(1, Math.floor(limit));
    return this.events.slice(Math.max(0, this.events.length - take));
  }

  getWarnings(): string[] {
    return [...this.warnings];
  }

  getErrors(): string[] {
    return [...this.errors];
  }
}
