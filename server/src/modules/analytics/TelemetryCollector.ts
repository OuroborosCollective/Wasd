export class TelemetryCollector {
  private events: any[] = [];

  record(type: string, payload: any = {}) {
    this.events.push({ type, payload, createdAt: 0 /* ARE-DETERMINISM-ALLOW: determinism placeholder */ });
  }

  list() {
    return this.events;
  }
}