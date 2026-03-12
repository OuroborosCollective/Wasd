export class GMCommandConsole {
  run(command: string) {
    return {
      command,
      status: "queued"
    };
  }
}