export class GMCommandLayer {
  execute(command:string, payload:any = {}) {
    return { command, payload, executedAt: Date.now() };
  }
}