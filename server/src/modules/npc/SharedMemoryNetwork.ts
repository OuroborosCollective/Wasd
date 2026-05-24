// @ARE-GUARD-EXEMPT: Legacy non-deterministic calls permitted for telemetry/meta paths
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