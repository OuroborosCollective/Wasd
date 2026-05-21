// @ARE-GUARD-EXEMPT: GM command execution timestamp; not simulation input.
export class GMCommandLayer {
  execute(command:string, payload:any = {}) {
    return { command, payload, executedAt: Date.now() };
  }
}