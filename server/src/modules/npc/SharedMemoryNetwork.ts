import { deterministicNow } from "../../core/determinism/AREDeterminism.js";

export class SharedMemoryNetwork {
  share(fromNpcId: string, toNpcId: string, memory: any) {
    return {
      fromNpcId,
      toNpcId,
      memory,
      sharedAt: deterministicNow(memory?.tick ?? `${fromNpcId}:${toNpcId}`)
    };
  }
}
