// @ARE-GUARD-EXEMPT: Infrastructure/Meta/Telemetry logic; not world-state critical.
export class TelemetryCollector {
  private events: any[] = [];

  record(type: string, payload: any = {}) {
    this.events.push({ type, payload, createdAt: Date.now() });
  }

  list() {
    return this.events;
  }
}