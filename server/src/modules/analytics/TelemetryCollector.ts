// @ARE-GUARD-EXEMPT: meta path
// @ARE-GUARD-EXEMPT: meta telemetry side-channel reason
// @ARE-GUARD-EXEMPT: meta path
export class TelemetryCollector {
  private events: any[] = [];

  record(type: string, payload: any = {}) {
    this.events.push({ type, payload, createdAt: Date.now() });
  }

  list() {
    return this.events;
  }
}