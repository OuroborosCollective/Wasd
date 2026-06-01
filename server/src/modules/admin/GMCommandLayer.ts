export class GMCommandLayer {
  execute(command:string, payload:any = {}) {
    return { command, payload, executedAt: 0 /* ARE-DETERMINISM-ALLOW: determinism placeholder */ };
  }
}