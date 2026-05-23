// @ARE-GUARD-EXEMPT: Metadata, telemetry or legacy logic currently using wall-clock.
export class SharedMemoryNetwork {
  share(fromNpcId: string, toNpcId: string, memory: any) {
    return {
      fromNpcId,
      toNpcId,
      memory,
      sharedAt: Date.now()
    };
  }
}