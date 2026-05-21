// @ARE-GUARD-EXEMPT: Infrastructure/Meta/Telemetry logic; not world-state critical.
export class TelemetryCollector {
  private entries:any[] = [];
  record(metric:string, value:any){
    const entry = { metric, value, ts: Date.now() };
    this.entries.push(entry);
    return entry;
  }
}