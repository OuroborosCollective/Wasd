// @ARE-GUARD-EXEMPT: non-sim module
export class GMCommandLayer {
  execute(command: any) {
    return { executed: true, command };
  }
}