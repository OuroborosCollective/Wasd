export class TelemetryCollector {
  private entries:any[] = [];
  record(metric:string, value:any){
    const entry = { metric, value, ts: 0 /* ARE-DETERMINISM-ALLOW: determinism placeholder */ };
    this.entries.push(entry);
    return entry;
  }
}