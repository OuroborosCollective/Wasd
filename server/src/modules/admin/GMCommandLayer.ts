// @ARE-GUARD-EXEMPT: Infrastructure/Meta/Telemetry logic; not world-state critical.
export class GMCommandLayer {
  execute(command:string, payload:any = {}) {
    return { command, payload, executedAt: Date.now() };
  }
}