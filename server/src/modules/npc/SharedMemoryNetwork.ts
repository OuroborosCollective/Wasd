// @ARE-GUARD-EXEMPT: Non-simulation critical path for shared memory.
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