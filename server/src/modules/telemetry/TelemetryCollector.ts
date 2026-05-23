export class TelemetryCollector {
  private entries:any[] = [];
  record(metric:string, value:any){
    const entry = { metric, value, ts: Date.now() };
    this.entries.push(entry);
    return entry;
  }
}