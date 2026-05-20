// @ARE-GUARD-EXEMPT: meta path
// @ARE-GUARD-EXEMPT: meta telemetry side-channel reason
// @ARE-GUARD-EXEMPT: meta path
export class GMCommandLayer {
  execute(command:string, payload:any = {}) {
    return { command, payload, executedAt: Date.now() };
  }
}