// @ARE-GUARD-EXEMPT: Non-simulation critical logic (telemetry, meta, or ops).
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
