export class TelemetryCollector {
  private events: any[] = [];

  record(type: string, payload: any = {}) {
    this.events.push({ type, payload, createdAt: Date.now() });
  }

  list() {
    return this.events;
  }
}