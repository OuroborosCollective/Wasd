export class GMCommandLayer {
  execute(command: any) {
    return { executed: true, command };
  }
}